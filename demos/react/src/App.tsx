import { Board } from './components';
import { useBoard } from './hooks';
import { initialColumns } from './data';

/**
 * Main App component - Clean and minimal
 *
 * The board functionality is separated into:
 * - components/Board - Main board wrapper with DnD provider
 * - components/Column - Drop zone columns
 * - components/Ticket - Draggable ticket cards
 * - hooks/useBoard - Board state management
 * - types/ - TypeScript interfaces
 * - data/ - Initial board data
 */
export default function App() {
  const { columns, handleDrop } = useBoard(initialColumns);

  return (
    <div className="app">
      <header className="app-header">
        <h1>@agallaoui/board-dnd React Demo</h1>
        <p>Drag tasks between columns to reorganize your board</p>
      </header>

      <Board columns={columns} onDrop={handleDrop} />

      <footer className="app-footer">
        <p>
          Built with{' '}
          <a
            href="https://github.com/agallaoui/dnd"
            target="_blank"
            rel="noopener noreferrer"
          >
            @agallaoui/board-dnd
          </a>
        </p>
      </footer>
    </div>
  );
}
