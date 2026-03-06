import ReactDOM from 'react-dom/client';
import DigitalBlockSpanTask from './DigitalBlockSpanTask';
import './app.css';

function GamePage() {
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
            digital block span is a spatial working-memory task. watch the sequence,
            then rebuild it with top-row blocks first and bottom-row blocks second.
          </p>
        </header>

        <DigitalBlockSpanTask />
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<GamePage />);
