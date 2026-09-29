import './tools.css';

/** An animated bar shown while a file is being processed. */
export function ProgressBar({ label }: { label: string }) {
  return (
    <div className="progress" role="status">
      <span className="progress-label">
        <span className="spinner" aria-hidden="true" />
        {label}
      </span>
      <span className="progress-track" aria-hidden="true">
        <span className="progress-bar" />
      </span>
    </div>
  );
}
