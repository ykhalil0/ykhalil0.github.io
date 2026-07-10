import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';

const BLOCKS = [
  { id: 1, label: 'upper left', x: 12, y: 20 },
  { id: 2, label: 'top center', x: 38, y: 11 },
  { id: 3, label: 'upper right', x: 68, y: 20 },
  { id: 4, label: 'middle right', x: 89, y: 42 },
  { id: 5, label: 'center', x: 59, y: 43 },
  { id: 6, label: 'middle left', x: 29, y: 46 },
  { id: 7, label: 'lower left', x: 11, y: 75 },
  { id: 8, label: 'bottom center', x: 39, y: 87 },
  { id: 9, label: 'lower right', x: 68, y: 71 },
  { id: 10, label: 'bottom right', x: 89, y: 89 },
];

const LENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_LENGTH = 5;
const COUNTDOWN_MS = 650;
const PLAYBACK_MS = 650;
const GAP_MS = 260;

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function randomInt(min, max) {
  const range = max - min + 1;

  if (range <= 0) return min;

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const maxUint32 = 0x100000000;
    const limit = Math.floor(maxUint32 / range) * range;
    const buffer = new Uint32Array(1);

    do {
      crypto.getRandomValues(buffer);
    } while (buffer[0] >= limit);

    return min + (buffer[0] % range);
  }

  return Math.floor(Math.random() * range) + min;
}

function shuffle(values) {
  const nextValues = [...values];

  for (let i = nextValues.length - 1; i > 0; i -= 1) {
    const swapIndex = randomInt(0, i);
    [nextValues[i], nextValues[swapIndex]] = [nextValues[swapIndex], nextValues[i]];
  }

  return nextValues;
}

function randomSequence(length, previous = []) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = shuffle(BLOCKS.map((block) => block.id)).slice(0, length);
    if (!arraysEqual(next, previous)) return next;
  }

  return shuffle(BLOCKS.map((block) => block.id)).slice(0, length);
}

function formatBlockLabel(id) {
  return BLOCKS.find((block) => block.id === id)?.label ?? `block ${id}`;
}

function formatSequence(sequence) {
  return sequence.map(formatBlockLabel).join(' → ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pluralizeBlock(length) {
  return length === 1 ? '1 block' : `${length} blocks`;
}

function CorsiBlock({ active, buttonRef, disabled, id, onClick, revealOrder, x, y }) {
  const label = formatBlockLabel(id);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      aria-label={`${label} Corsi block`}
      className={`absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 touch-manipulation rounded-xl border-2 transition-all duration-150 focus-visible:z-10 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-slate-900 motion-reduce:transition-none sm:h-16 sm:w-16 sm:rounded-2xl md:h-20 md:w-20 ${
        active
          ? 'z-10 scale-110 border-amber-950 bg-amber-300 shadow-2xl'
          : 'border-cyan-800 bg-cyan-600 enabled:hover:scale-105 enabled:hover:bg-cyan-700'
      } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="sr-only">{label} Corsi block</span>
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-xl ring-4 ring-offset-2 sm:rounded-2xl ${
          active ? 'ring-amber-200' : 'ring-transparent'
        }`}
      />
      {revealOrder > 0 && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-base font-bold text-white sm:text-lg"
        >
          {revealOrder}
        </span>
      )}
    </button>
  );
}

function ResultBadge({ correct }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {correct ? 'Correct' : 'Incorrect'}
    </span>
  );
}

export default function ReverseCorsiBlockTask() {
  const [sequenceLength, setSequenceLength] = useState(DEFAULT_LENGTH);
  const [currentSequence, setCurrentSequence] = useState(() => randomSequence(DEFAULT_LENGTH));
  const [stage, setStage] = useState('ready');
  const [countdown, setCountdown] = useState(3);
  const [activeBlock, setActiveBlock] = useState(null);
  const [response, setResponse] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [bestSolvedLength, setBestSolvedLength] = useState(0);

  const boardSectionRef = useRef(null);
  const firstBlockRef = useRef(null);
  const responseStartRef = useRef(null);
  const resultSectionRef = useRef(null);
  const tapTimerRef = useRef(null);
  const expected = useMemo(() => [...currentSequence].reverse(), [currentSequence]);
  const accuracy = totalRounds ? Math.round((totalCorrect / totalRounds) * 100) : 0;
  const latestWasIncorrect = Boolean(latestResult && !latestResult.correct);
  const latestWasCorrect = Boolean(latestResult && latestResult.correct);

  function resetRoundState() {
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }

    responseStartRef.current = null;
    setStage('ready');
    setCountdown(3);
    setActiveBlock(null);
    setResponse([]);
  }

  function loadRandomSequence(nextLength = sequenceLength) {
    setCurrentSequence((current) => randomSequence(nextLength, current));
    setLatestResult(null);
    resetRoundState();
  }

  function selectSequenceLength(nextLength) {
    setSequenceLength(nextLength);
    setCurrentSequence((current) => randomSequence(nextLength, current));
    setLatestResult(null);
    resetRoundState();
  }

  function focusBoard() {
    boardSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  function startSequence() {
    setLatestResult(null);
    resetRoundState();
    setCountdown(3);
    setStage('countdown');
    focusBoard();
  }

  function startNewSequence() {
    setCurrentSequence((current) => randomSequence(sequenceLength, current));
    setLatestResult(null);
    setResponse([]);
    responseStartRef.current = null;
    setActiveBlock(null);
    setCountdown(3);
    setStage('countdown');
    focusBoard();
  }

  function handlePrimaryAction() {
    startSequence();
  }

  function clearResponse() {
    if (stage !== 'respond') return;
    setActiveBlock(null);
    setResponse([]);
  }

  function resetSession() {
    setCurrentSequence((current) => randomSequence(sequenceLength, current));
    setTotalRounds(0);
    setTotalCorrect(0);
    setBestSolvedLength(0);
    setLatestResult(null);
    resetRoundState();
  }

  function handleTryAgain() {
    startNewSequence();
  }

  function handleNextChallenge() {
    startNewSequence();
  }

  useEffect(() => {
    return () => {
      if (tapTimerRef.current) {
        window.clearTimeout(tapTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (stage !== 'countdown') return undefined;

    const timer = window.setTimeout(() => {
      if (countdown <= 1) {
        setStage('watch');
        setPlayKey((value) => value + 1);
        return;
      }

      setCountdown((value) => value - 1);
    }, COUNTDOWN_MS);

    return () => window.clearTimeout(timer);
  }, [stage, countdown]);

  useEffect(() => {
    if (stage !== 'watch') return undefined;

    let cancelled = false;

    async function runPlayback() {
      for (const blockId of currentSequence) {
        if (cancelled) return;
        setActiveBlock(blockId);
        await sleep(PLAYBACK_MS);
        if (cancelled) return;
        setActiveBlock(null);
        await sleep(GAP_MS);
      }

      if (!cancelled) {
        responseStartRef.current = performance.now();
        setStage('respond');
      }
    }

    runPlayback();

    return () => {
      cancelled = true;
      setActiveBlock(null);
    };
  }, [stage, currentSequence, playKey]);

  useEffect(() => {
    if (stage === 'respond') {
      firstBlockRef.current?.focus({ preventScroll: true });
    }

    if (stage === 'result') {
      resultSectionRef.current?.focus({ preventScroll: true });
      resultSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [stage]);

  function handleTap(id) {
    if (stage !== 'respond') return;

    const now = performance.now();
    const elapsed = responseStartRef.current ? Math.round(now - responseStartRef.current) : 0;
    const nextResponse = [...response, id];

    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
    }
    setActiveBlock(id);
    tapTimerRef.current = window.setTimeout(() => {
      setActiveBlock(null);
      tapTimerRef.current = null;
    }, 160);
    setResponse(nextResponse);

    if (nextResponse.length === expected.length) {
      const correct = arraysEqual(nextResponse, expected);

      setTotalRounds((value) => value + 1);
      if (correct) {
        setTotalCorrect((value) => value + 1);
        setBestSolvedLength((value) => Math.max(value, sequenceLength));
      }

      setLatestResult({
        trial: totalRounds + 1,
        length: sequenceLength,
        expected,
        response: nextResponse,
        completionMs: elapsed,
        correct,
      });
      setStage('result');
    }
  }

  const isRoundActive = stage === 'countdown' || stage === 'watch' || stage === 'respond';
  const primaryActionLabel =
    stage === 'countdown'
      ? `Starting in ${countdown}`
      : stage === 'watch'
        ? 'Playing…'
        : 'Start sequence';
  const stageLabel =
    stage === 'countdown'
      ? `Starting in ${countdown}`
      : stage === 'watch'
        ? 'Watch the sequence'
      : stage === 'respond'
        ? 'Your turn'
        : stage === 'result'
          ? latestResult?.correct
            ? 'Correct'
            : 'Not quite'
          : 'Ready';
  const liveMessage =
    stage === 'countdown'
      ? `Starting in ${countdown}`
      : stage === 'watch'
        ? activeBlock
          ? `Watch: ${formatBlockLabel(activeBlock)}`
          : 'Watch the sequence.'
        : stage === 'respond'
          ? `Your turn. Select ${currentSequence.length} blocks in reverse order.`
          : latestResult
            ? latestResult.correct
              ? `Correct. You reversed ${latestResult.length} blocks.`
              : 'Incorrect. Review the expected reverse order below.'
            : 'Ready to start.';

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Reverse Corsi Block
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Watch the highlighted blocks, then tap the same path backward. Pick any span from
              1 to 10 before starting.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Round {latestResult?.trial ?? totalRounds + 1}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Selected {pluralizeBlock(sequenceLength)}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Best solved {bestSolvedLength || '-'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Accuracy {totalRounds ? `${accuracy}%` : '-'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowInstructions((value) => !value)}
            aria-expanded={showInstructions}
            disabled={isRoundActive}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            <HelpCircle className="h-4 w-4" />
            How to play
            {showInstructions ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {showInstructions && (
          <div className="mt-4 rounded-3xl bg-slate-50 p-4">
            <ol className="space-y-2 text-sm leading-6 text-slate-600">
              <li>1. Choose the span length you want to practice.</li>
              <li>2. Tap Start and watch each block highlight in order.</li>
              <li>3. When the board says Go, tap the blocks in the reverse order.</li>
              <li>4. The round scores automatically after the final tap.</li>
            </ol>
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Span length</h3>
            <p className="mt-1 text-xs text-slate-500">Jump straight to any level.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {pluralizeBlock(sequenceLength)}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {LENGTH_OPTIONS.map((length) => {
            const selected = length === sequenceLength;

            return (
              <button
                key={length}
                type="button"
                onClick={() => selectSequenceLength(length)}
                disabled={isRoundActive}
                aria-pressed={selected}
                className={`min-h-[44px] rounded-2xl border px-2 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {length}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => loadRandomSequence(sequenceLength)}
            disabled={isRoundActive}
            className="min-h-[48px] rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New challenge
          </button>
          <button
            type="button"
            onClick={resetSession}
            disabled={isRoundActive}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="font-medium text-slate-700">Stage: {stageLabel}</span>
          <span>
            {response.length} / {currentSequence.length} taps
          </span>
          <span>
            {totalCorrect} / {totalRounds} correct
          </span>
        </div>
      </section>

      <section
        ref={boardSectionRef}
        className="scroll-mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Corsi board</h3>
            <p className="text-sm text-slate-600">Participant view</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {response.length} of {currentSequence.length} selected
            </span>
            {stage === 'respond' && response.length > 0 && (
              <button
                type="button"
                onClick={clearResponse}
                className="min-h-[44px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 sm:w-auto"
              >
                Clear taps
              </button>
            )}
            {stage !== 'result' && stage !== 'respond' && (
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isRoundActive}
                className="min-h-[48px] w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
              >
                {primaryActionLabel}
              </button>
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="assertive" aria-atomic="true">
          {liveMessage}
        </p>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-2 sm:p-4 md:p-8">
          <div className="mx-auto max-w-3xl rounded-[1.5rem] border-2 border-slate-200 bg-white p-2 sm:rounded-[1.75rem] sm:border-4 sm:p-4 md:p-6">
            <div className="relative aspect-square w-full rounded-2xl bg-slate-100 shadow-inner sm:aspect-[4/3] sm:rounded-3xl">
              {BLOCKS.map((block) => (
                <CorsiBlock
                  key={block.id}
                  id={block.id}
                  buttonRef={block.id === BLOCKS[0].id ? firstBlockRef : undefined}
                  x={block.x}
                  y={block.y}
                  active={activeBlock === block.id}
                  disabled={stage !== 'respond'}
                  onClick={handleTap}
                  revealOrder={stage === 'result' ? expected.indexOf(block.id) + 1 : 0}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {latestResult && stage === 'result' && (
        <section
          ref={resultSectionRef}
          tabIndex="-1"
          role="status"
          aria-live="polite"
          className="scroll-mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm outline-none sm:p-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-slate-900">Result</h3>
            <ResultBadge correct={latestResult.correct} />
          </div>

          {latestWasCorrect && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-800">Reverse path matched.</div>
                <div className="mt-1 text-sm text-emerald-700">
                  {pluralizeBlock(latestResult.length)} completed in {latestResult.completionMs} ms.
                </div>
              </div>
              <button
                type="button"
                onClick={handleNextChallenge}
                className="min-h-[44px] rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                Next challenge
              </button>
            </div>
          )}

          {latestWasIncorrect && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-rose-800">Incorrect reverse order.</div>
                <div className="mt-1 text-sm text-rose-700">
                  Review the numbered path on the board, then try a fresh pattern.
                </div>
              </div>
              <button
                type="button"
                onClick={handleTryAgain}
                className="min-h-[44px] rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                New challenge
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Expected reverse order
              </div>
              <div className="mt-2 break-words text-sm text-slate-700">
                {formatSequence(latestResult.expected)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your order
              </div>
              <div className="mt-2 break-words text-sm text-slate-700">
                {formatSequence(latestResult.response)}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
