import ReactDOM from 'react-dom/client';
import DigitalBlockSpanTask from './DigitalBlockSpanTask';
import ReverseCorsiBlockTask from './ReverseCorsiBlockTask';
import './app.css';

const GAMES = {
  'digital-block-span': {
    href: '/games/digital-block-span/',
    label: 'Digital Block Span',
    intro:
      'digital block span is a spatial working-memory task. watch the sequence, then rebuild it with top-row blocks first and bottom-row blocks second.',
    component: DigitalBlockSpanTask,
  },
  'reverse-corsi-block': {
    href: '/games/reverse-corsi-block/',
    label: 'Reverse Corsi Block',
    intro:
      'reverse corsi block is a spatial working-memory task. watch the blocks in order, then tap them backward at any selected span length.',
    component: ReverseCorsiBlockTask,
  },
};

function getActiveGameSlug() {
  const root = document.getElementById('root');
  const configuredGame = root?.dataset.game;

  if (configuredGame && GAMES[configuredGame]) {
    return configuredGame;
  }

  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const pathSlug = pathParts[pathParts.length - 1];

  return GAMES[pathSlug] ? pathSlug : 'digital-block-span';
}

function GamePage() {
  const activeGameSlug = getActiveGameSlug();
  const activeGame = GAMES[activeGameSlug];
  const ActiveGameComponent = activeGame.component;

  return (
    <div className="min-h-screen bg-white text-[#222222]">
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8 border-b border-slate-200 pb-6">
          <a
            href="/"
            className="text-sm text-[#0b63c6] underline-offset-4 transition hover:underline"
          >
            back
          </a>
          <h1 className="mt-4 text-[34px] font-bold leading-tight text-[#111111]">games</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-slate-600">
            {activeGame.intro}
          </p>
          <nav aria-label="Game selection" className="mt-5 flex flex-wrap gap-2">
            {Object.entries(GAMES).map(([slug, game]) => {
              const isActive = slug === activeGameSlug;

              return (
                <a
                  key={slug}
                  href={game.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold no-underline transition ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {game.label}
                </a>
              );
            })}
          </nav>
        </header>

        <ActiveGameComponent />
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GamePage />);
