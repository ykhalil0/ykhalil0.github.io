import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle, RotateCcw } from 'lucide-react';

const TOP_ROW = [1, 2, 3, 4];
const BOTTOM_ROW = [5, 6, 7, 8];
const MIN_LENGTH = 2;
const MAX_LENGTH = 16;
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

function randomSequence(length) {
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

function formatSequence(sequence) {
  return sequence.join(' · ');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function Block({ active, disabled, onClick, id }) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      disabled={disabled}
      aria-label={`Memory block ${id}`}
      className={`touch-manipulation relative h-16 w-16 rounded-2xl border-2 transition-all duration-150 sm:h-20 sm:w-20 sm:rounded-3xl md:h-24 md:w-24 ${
        active
          ? 'scale-105 border-white bg-blue-600 shadow-2xl'
          : 'border-blue-700 bg-blue-500 hover:scale-[1.02]'
      } ${disabled ? 'cursor-not-allowed opacity-[0.85]' : 'cursor-pointer'}`}
    >
      <span className="sr-only">Memory block {id}</span>
      <div
        className={`absolute inset-0 rounded-2xl ring-4 ring-offset-2 sm:rounded-3xl ${
          active ? 'ring-white/80' : 'ring-transparent'
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

export default function DigitalBlockSpanTask() {
  const [sequenceLength, setSequenceLength] = useState(7);
  const [currentTrial, setCurrentTrial] = useState(1);
  const [currentSequence, setCurrentSequence] = useState(() => randomSequence(7));
  const [stage, setStage] = useState('ready');
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

  const responseStartRef = useRef(null);

  const expected = useMemo(() => buildExpected(currentSequence), [currentSequence]);
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

  function handleSequenceLengthChange(value) {
    const nextLength = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Number(value)));
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

  function clearResponse() {
    if (stage !== 'respond') return;
    responseStartRef.current = performance.now();
    setResponse([]);
  }

  function resetSession() {
    setCurrentTrial(1);
    setCurrentSequence(randomSequence(sequenceLength));
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTotalRounds(0);
    setTotalCorrect(0);
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
        trial: currentTrial,
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

  const isRoundActive = stage === 'watch' || stage === 'respond';
  const primaryActionLabel =
    stage === 'watch' ? 'Playing...' : totalRounds === 0 && currentTrial === 1 ? 'Start' : 'Replay';

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Digital Block Span
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Each block appears once per second. Watch the sequence, then tap
              yellow-row blocks first and red-row blocks second.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Round {currentTrial}
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
              <li>1. Tap ‘Start’ to watch the sequence.</li>
              <li>2. Wait until playback finishes. Each block is shown at one block per second.</li>
              <li>3. Rebuild the sequence by tapping yellow-row blocks first, then red-row blocks.</li>
              <li>4. If you miss, use ‘Try again’ to get a fresh challenge at the same length.</li>
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

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={playSequence}
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
            className="min-h-[48px] rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            New
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
          <span className="font-medium text-slate-700">Stage: {stage}</span>
          <span>
            {response.length} / {currentSequence.length} taps
          </span>
          <span>Best streak {bestStreak}</span>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Challenge board</h3>
            <p className="text-sm text-slate-600">Participant view</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {responseProgress}% complete
          </span>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-3 sm:p-4 md:p-8">
          <div className="mx-auto max-w-3xl rounded-[1.75rem] border-4 border-slate-200 bg-white p-3 sm:p-4 md:p-6">
            <div className="space-y-5 sm:space-y-8">
              <div className="rounded-3xl bg-amber-300/90 px-3 py-5 shadow-inner sm:px-4 sm:py-7">
                <div className="grid grid-cols-4 justify-items-center gap-3 sm:gap-4 md:gap-8">
                  {TOP_ROW.map((id) => (
                    <Block
                      key={id}
                      id={id}
                      active={activeBlock === id}
                      disabled={stage !== 'respond'}
                      onClick={handleTap}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-rose-400/90 px-3 py-5 shadow-inner sm:px-4 sm:py-7">
                <div className="grid grid-cols-4 justify-items-center gap-3 sm:gap-4 md:gap-8">
                  {BOTTOM_ROW.map((id) => (
                    <Block
                      key={id}
                      id={id}
                      active={activeBlock === id}
                      disabled={stage !== 'respond'}
                      onClick={handleTap}
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
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
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
                <div className="text-sm font-semibold text-rose-800">Incorrect. Try again.</div>
                <div className="mt-1 text-sm text-rose-700">
                  A new challenge at the same length will be generated.
                </div>
              </div>
              <button
                type="button"
                onClick={handleTryAgain}
                className="min-h-[44px] rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
              >
                Try again
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
