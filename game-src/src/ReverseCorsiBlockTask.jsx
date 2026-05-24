import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';

const BLOCKS = [
  { id: 1, x: 16, y: 26 },
  { id: 2, x: 40, y: 15 },
  { id: 3, x: 68, y: 24 },
  { id: 4, x: 84, y: 46 },
  { id: 5, x: 55, y: 43 },
  { id: 6, x: 25, y: 49 },
  { id: 7, x: 14, y: 72 },
  { id: 8, x: 43, y: 80 },
  { id: 9, x: 72, y: 73 },
  { id: 10, x: 88, y: 82 },
];

const LENGTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_LENGTH = 5;
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

function randomSequence(length) {
  return shuffle(BLOCKS.map((block) => block.id)).slice(0, length);
}

function formatSequence(sequence) {
  return sequence.join(' -> ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pluralizeBlock(length) {
  return length === 1 ? '1 block' : `${length} blocks`;
}

function CorsiBlock({ active, disabled, id, onClick, x, y }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      aria-label={`Corsi block ${id}`}
      className={`absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 touch-manipulation rounded-2xl border-2 transition-all duration-150 sm:h-16 sm:w-16 md:h-20 md:w-20 ${
        active
          ? 'scale-110 border-white bg-cyan-500 shadow-2xl'
          : 'border-cyan-700 bg-cyan-600 hover:scale-105'
      } ${disabled ? 'cursor-not-allowed opacity-[0.88]' : 'cursor-pointer'}`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <span className="sr-only">Corsi block {id}</span>
      <span
        className={`absolute inset-0 rounded-2xl ring-4 ring-offset-2 ${
          active ? 'ring-cyan-200/90' : 'ring-transparent'
        }`}
      />
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
  const [currentTrial, setCurrentTrial] = useState(1);
  const [currentSequence, setCurrentSequence] = useState(() => randomSequence(DEFAULT_LENGTH));
  const [stage, setStage] = useState('ready');
  const [activeBlock, setActiveBlock] = useState(null);
  const [response, setResponse] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [bestSolvedLength, setBestSolvedLength] = useState(0);

  const responseStartRef = useRef(null);
  const expected = useMemo(() => [...currentSequence].reverse(), [currentSequence]);
  const accuracy = totalRounds ? Math.round((totalCorrect / totalRounds) * 100) : 0;
  const responseProgress = currentSequence.length
    ? Math.round((response.length / currentSequence.length) * 100)
    : 0;
  const latestWasIncorrect = Boolean(latestResult && !latestResult.correct);
  const latestWasCorrect = Boolean(latestResult && latestResult.correct);

  function resetRoundState() {
    responseStartRef.current = null;
    setStage('ready');
    setActiveBlock(null);
    setResponse([]);
  }

  function loadRandomSequence(nextLength = sequenceLength, incrementTrial = false) {
    setCurrentSequence(randomSequence(nextLength));
    setLatestResult(null);
    resetRoundState();
    if (incrementTrial) {
      setCurrentTrial((value) => value + 1);
    }
  }

  function selectSequenceLength(nextLength) {
    setSequenceLength(nextLength);
    setCurrentSequence(randomSequence(nextLength));
    setLatestResult(null);
    resetRoundState();
  }

  function playSequence() {
    setLatestResult(null);
    resetRoundState();
    setStage('watch');
    setPlayKey((value) => value + 1);
  }

  function startNewSequence() {
    setCurrentSequence(randomSequence(sequenceLength));
    setLatestResult(null);
    setCurrentTrial((value) => value + 1);
    resetRoundState();
    setStage('watch');
    setPlayKey((value) => value + 1);
  }

  function handlePrimaryAction() {
    if (stage === 'result') {
      startNewSequence();
      return;
    }

    playSequence();
  }

  function clearResponse() {
    if (stage !== 'respond') return;
    responseStartRef.current = performance.now();
    setResponse([]);
  }

  function resetSession() {
    setCurrentTrial(1);
    setCurrentSequence(randomSequence(sequenceLength));
    setTotalRounds(0);
    setTotalCorrect(0);
    setBestSolvedLength(0);
    setLatestResult(null);
    resetRoundState();
  }

  function handleTryAgain() {
    loadRandomSequence(sequenceLength, true);
  }

  function handleNextChallenge() {
    loadRandomSequence(sequenceLength, true);
  }

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

  function handleTap(id) {
    if (stage !== 'respond') return;

    const now = performance.now();
    const elapsed = responseStartRef.current ? Math.round(now - responseStartRef.current) : 0;
    const nextResponse = [...response, id];

    setResponse(nextResponse);

    if (nextResponse.length === expected.length) {
      const correct = arraysEqual(nextResponse, expected);

      setTotalRounds((value) => value + 1);
      if (correct) {
        setTotalCorrect((value) => value + 1);
        setBestSolvedLength((value) => Math.max(value, sequenceLength));
      }

      setLatestResult({
        trial: currentTrial,
        length: sequenceLength,
        expected,
        response: nextResponse,
        completionMs: elapsed,
        correct,
      });
      setStage('result');
    }
  }

  const isRoundActive = stage === 'watch' || stage === 'respond';
  const primaryActionLabel =
    stage === 'watch'
      ? 'Playing...'
      : totalRounds === 0 && currentTrial === 1
        ? 'Start'
        : 'Start new block';
  const stageLabel =
    stage === 'watch'
      ? 'Watch'
      : stage === 'respond'
        ? 'Go'
        : stage === 'result'
          ? 'Result'
          : 'Ready';

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
                Round {currentTrial}
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
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={stage === 'watch'}
            className="min-h-[48px] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            onClick={clearResponse}
            disabled={stage !== 'respond'}
            className="min-h-[48px] rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => loadRandomSequence(sequenceLength, true)}
            disabled={isRoundActive}
            className="min-h-[48px] rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            New pattern
          </button>
          <button
            type="button"
            onClick={resetSession}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
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

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Corsi board</h3>
            <p className="text-sm text-slate-600">Participant view</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {responseProgress}% complete
          </span>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-8">
          <div className="mx-auto max-w-3xl rounded-[1.75rem] border-4 border-slate-200 bg-white p-3 sm:p-4 md:p-6">
            <div className="relative aspect-[4/3] w-full rounded-3xl bg-slate-100 shadow-inner">
              <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                {stageLabel}
              </div>
              {BLOCKS.map((block) => (
                <CorsiBlock
                  key={block.id}
                  id={block.id}
                  x={block.x}
                  y={block.y}
                  active={activeBlock === block.id}
                  disabled={stage !== 'respond'}
                  onClick={handleTap}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {latestResult && stage === 'result' && (
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
                New {pluralizeBlock(sequenceLength)} run
              </button>
            </div>
          )}

          {latestWasIncorrect && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-rose-800">Incorrect reverse order.</div>
                <div className="mt-1 text-sm text-rose-700">
                  Try another pattern at the same span, or pick a different length.
                </div>
              </div>
              <button
                type="button"
                onClick={handleTryAgain}
                className="min-h-[44px] rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Try another {pluralizeBlock(sequenceLength)} run
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
