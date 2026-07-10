import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';

const TOP_ROW = [1, 2, 3, 4];
const BOTTOM_ROW = [5, 6, 7, 8];
const MIN_LENGTH = 2;
const MAX_LENGTH = 16;
const DEFAULT_LENGTH = 4;
const COUNTDOWN_MS = 650;
const PLAYBACK_MS = 500;
const GAP_MS = 500;

function buildExpected(sequence) {
  return sequence.filter((n) => n <= 4).concat(sequence.filter((n) => n >= 5));
}

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

function generateSequence(length) {
  const safeLength = Math.max(MIN_LENGTH, length);
  const maxRepeatsPerBlock = safeLength >= 10 ? 3 : 2;
  const minPerRow = safeLength >= 6 ? 2 : 1;

  for (let attempt = 0; attempt < 250; attempt += 1) {
    const sequence = [];

    while (sequence.length < safeLength) {
      const candidate = randomInt(1, 8);
      const last = sequence[sequence.length - 1];
      const occurrences = sequence.filter((value) => value === candidate).length;

      if (candidate === last) continue;
      if (occurrences >= maxRepeatsPerBlock) continue;

      sequence.push(candidate);
    }

    const topCount = sequence.filter((value) => value <= 4).length;
    const bottomCount = sequence.length - topCount;

    if (topCount >= minPerRow && bottomCount >= minPerRow) {
      return sequence;
    }
  }

  return Array.from(
    { length: safeLength },
    (_, index) => ((index + randomInt(0, 7)) % 8) + 1,
  );
}

function randomSequence(length, previous = []) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = generateSequence(length);
    if (!arraysEqual(next, previous)) return next;
  }

  return generateSequence(length);
}

function formatSequence(sequence) {
  return sequence.map(formatBlockLabel).join(' → ');
}

function formatBlockLabel(id) {
  const row = id <= 4 ? 'top' : 'bottom';
  const position = id <= 4 ? id : id - 4;
  return `${row} ${position}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Block({ active, buttonRef, disabled, id, onClick, revealLabel }) {
  const row = id <= 4 ? 'top' : 'bottom';
  const position = id <= 4 ? id : id - 4;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      aria-label={`${row} row, position ${position}`}
      className={`relative aspect-square w-full min-w-0 max-w-24 touch-manipulation rounded-xl border-2 transition-all duration-150 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-slate-900 motion-reduce:transition-none sm:rounded-2xl ${
        active
          ? 'scale-110 border-white bg-slate-950 shadow-2xl'
          : 'border-blue-800 bg-blue-500 enabled:hover:scale-[1.03] enabled:hover:bg-blue-600'
      } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className="sr-only">
        {row} row, position {position}
      </span>
      <span
        aria-hidden="true"
        className={`absolute inset-0 rounded-xl ring-4 ring-offset-2 sm:rounded-2xl ${
          active ? 'ring-sky-200' : 'ring-transparent'
        }`}
      />
      {revealLabel && (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center text-sm font-bold uppercase text-white sm:text-base"
        >
          {row === 'top' ? 'T' : 'B'}{position}
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

export default function DigitalBlockSpanTask() {
  const [sequenceLength, setSequenceLength] = useState(DEFAULT_LENGTH);
  const [currentSequence, setCurrentSequence] = useState(() => randomSequence(DEFAULT_LENGTH));
  const [stage, setStage] = useState('ready');
  const [countdown, setCountdown] = useState(3);
  const [activeBlock, setActiveBlock] = useState(null);
  const [response, setResponse] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [playKey, setPlayKey] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);

  const boardSectionRef = useRef(null);
  const firstBlockRef = useRef(null);
  const responseStartRef = useRef(null);
  const resultSectionRef = useRef(null);

  const expected = useMemo(() => buildExpected(currentSequence), [currentSequence]);
  const accuracy = totalRounds ? Math.round((totalCorrect / totalRounds) * 100) : 0;
  const latestWasIncorrect = Boolean(latestResult && !latestResult.correct);
  const latestWasCorrect = Boolean(latestResult && latestResult.correct);

  function resetRoundState() {
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

  function handleSequenceLengthChange(value) {
    const nextLength = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Number(value)));
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

  function startNewChallenge() {
    setCurrentSequence((current) => randomSequence(sequenceLength, current));
    setLatestResult(null);
    setResponse([]);
    responseStartRef.current = null;
    setActiveBlock(null);
    setCountdown(3);
    setStage('countdown');
    focusBoard();
  }

  function clearResponse() {
    if (stage !== 'respond') return;
    setResponse([]);
  }

  function resetSession() {
    setCurrentSequence((current) => randomSequence(sequenceLength, current));
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotalRounds(0);
    setTotalCorrect(0);
    setLatestResult(null);
    resetRoundState();
  }

  function handleTryAgain() {
    startNewChallenge();
  }

  function handleNextChallenge() {
    startNewChallenge();
  }

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

    setResponse(nextResponse);

    if (nextResponse.length === expected.length) {
      const correct = arraysEqual(nextResponse, expected);
      const nextStreak = correct ? streak + 1 : 0;
      const basePoints = correct ? sequenceLength * 100 : 0;
      const speedTargetMs = Math.max(2500, sequenceLength * 2500);
      const speedBonus = correct ? Math.max(0, Math.round((speedTargetMs - elapsed) / 50)) : 0;
      const streakBonus = correct ? streak * 50 : 0;
      const pointsEarned = basePoints + speedBonus + streakBonus;

      setTotalRounds((value) => value + 1);
      if (correct) {
        setTotalCorrect((value) => value + 1);
      }

      setScore((value) => value + pointsEarned);
      setStreak(nextStreak);
      setBestStreak((value) => Math.max(value, nextStreak));
      setLatestResult({
        trial: totalRounds + 1,
        length: sequenceLength,
        expected,
        response: nextResponse,
        completionMs: elapsed,
        correct,
        pointsEarned,
        streakAfterRound: nextStreak,
      });
      setStage('result');
    }
  }

  const isRoundActive = stage === 'countdown' || stage === 'watch' || stage === 'respond';
  const stageLabel =
    stage === 'countdown'
      ? `Starting in ${countdown}`
      : stage === 'watch'
        ? 'Watch the sequence'
        : stage === 'respond'
          ? 'Your turn'
          : stage === 'result'
            ? 'Result'
            : 'Ready';
  const liveMessage =
    stage === 'countdown'
      ? `Starting in ${countdown}`
      : stage === 'watch'
        ? activeBlock
          ? `Watch: ${formatBlockLabel(activeBlock)}`
          : 'Watch the sequence.'
        : stage === 'respond'
          ? `Your turn. Enter ${currentSequence.length} taps, top row first and bottom row second.`
          : latestResult
            ? latestResult.correct
              ? `Correct. You earned ${latestResult.pointsEarned} points.`
              : 'Incorrect. Review the expected response and start a new challenge.'
            : 'Ready to start.';

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Digital Block Span
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Watch the sequence, then rebuild it with every top-row tap first and every
              bottom-row tap second. Keep the original order within each row.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Round {latestResult?.trial ?? totalRounds + 1}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Score {score.toLocaleString()}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Streak {streak}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Accuracy {totalRounds ? `${accuracy}%` : '—'}
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
              <li>1. Choose a sequence length and tap Start sequence.</li>
              <li>2. Watch each block flash once. The board will tell you when it is your turn.</li>
              <li>3. Tap the top-row blocks in their original order, then the bottom-row blocks.</li>
              <li>4. Each challenge scores once. A new challenge always uses a new sequence.</li>
            </ol>
          </div>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="sequence-length" className="text-sm font-semibold text-slate-800">
            Sequence length
          </label>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
            {sequenceLength}
          </span>
        </div>

        <input
          id="sequence-length"
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step="1"
          value={sequenceLength}
          onChange={(e) => handleSequenceLengthChange(e.target.value)}
          disabled={isRoundActive}
          className="mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50"
        />

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
          <span className="font-medium text-slate-700">{stageLabel}</span>
          <span>
            {response.length} / {currentSequence.length} taps
          </span>
          <span>Best streak {bestStreak}</span>
        </div>
      </section>

      <section
        ref={boardSectionRef}
        className="scroll-mt-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
      >
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Challenge board</h3>
            <p className="text-sm text-slate-600">{stageLabel}</p>
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
                onClick={startSequence}
                disabled={isRoundActive}
                className="min-h-[48px] w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-44"
              >
                {stage === 'countdown'
                  ? `Starting in ${countdown}`
                  : stage === 'watch'
                    ? 'Playing…'
                    : 'Start sequence'}
              </button>
            )}
          </div>
        </div>

        <p className="sr-only" aria-live="assertive" aria-atomic="true">
          {liveMessage}
        </p>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-2 sm:p-4 md:p-8">
          <div className="mx-auto max-w-3xl rounded-[1.5rem] border-2 border-slate-200 bg-white p-2 sm:rounded-[1.75rem] sm:border-4 sm:p-4 md:p-6">
            <div className="space-y-5 sm:space-y-8">
              <div className="rounded-2xl bg-amber-300 px-2 py-4 shadow-inner sm:rounded-3xl sm:px-4 sm:py-7">
                <div className="grid grid-cols-4 justify-items-center gap-2 sm:gap-4 md:gap-8">
                  {TOP_ROW.map((id) => (
                    <Block
                      key={id}
                      id={id}
                      buttonRef={id === TOP_ROW[0] ? firstBlockRef : undefined}
                      active={activeBlock === id}
                      disabled={stage !== 'respond'}
                      onClick={handleTap}
                      revealLabel={stage === 'result'}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-rose-400 px-2 py-4 shadow-inner sm:rounded-3xl sm:px-4 sm:py-7">
                <div className="grid grid-cols-4 justify-items-center gap-2 sm:gap-4 md:gap-8">
                  {BOTTOM_ROW.map((id) => (
                    <Block
                      key={id}
                      id={id}
                      active={activeBlock === id}
                      disabled={stage !== 'respond'}
                      onClick={handleTap}
                      revealLabel={stage === 'result'}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {response.length > 0 && stage === 'respond' && (
          <div className="mt-4 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Your taps: {formatSequence(response)}
          </div>
        )}
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
                <div className="text-sm font-semibold text-emerald-800">Nice work.</div>
                <div className="mt-1 text-sm text-emerald-700">
                  +{latestResult.pointsEarned} points · streak {latestResult.streakAfterRound}
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
                <div className="text-sm font-semibold text-rose-800">Not quite.</div>
                <div className="mt-1 text-sm text-rose-700">
                  Review the row positions below, then try a fresh sequence at the same length.
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
                Expected response
              </div>
              <div className="mt-2 break-words text-sm text-slate-700">
                {formatSequence(latestResult.expected)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Your response
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
