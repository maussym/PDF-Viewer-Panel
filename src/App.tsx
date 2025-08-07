import './App.css'
import PDFViewer from './components/PDFViewer'

function App() {
  return (
    <div className="app-container">
      <header>
        <h1>PDF Viewer Panel</h1>
      </header>
      <main>
        <PDFViewer pdfUrl="/example.pdf" />
      </main>
      <footer>
        <p>PDF panel with zoom and pan capabilities.</p>
      </footer>
    </div>
  )
}

export default App
