import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import './PDFViewer.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

interface PDFViewerProps {pdfUrl: string;}

const PDFViewer: React.FC<PDFViewerProps> = ({ pdfUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderTaskRef = useRef<any>(null);
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.5);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadPdf = async () => {
      try {
        if (!isMounted) return;

        setLoading(true);
        setError(null);

        if (!pdfUrl) {
          setError('The URL of the PDF file is not specified.');
          setLoading(false);
          return;
        }

        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setPdfDocument(pdf);
        setNumPages(pdf.numPages);
        setCurrentPage(1);
      } catch (err) {
        if (!isMounted) return;

        console.error('Error loading PDF:', err);
        setError('Error loading PDF. Please try again.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
      if (pdfDocument) {
        pdfDocument.destroy();
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    let isMounted = true;

    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current || !isMounted) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDocument.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas context not available');

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        context.clearRect(0, 0, canvas.width, canvas.height);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        };

        const renderTask = page.render(renderContext);
        if (isMounted) {
          renderTaskRef.current = renderTask;
        }

        await renderTask.promise;
      } catch (err) {
        if (
          err instanceof Error &&
          err.message !== 'Rendering cancelled' &&
          isMounted
        ) {
          console.error('Error rendering PDF page:', err);
          setError('Error rendering PDF page. Please try again.');
        }
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [pdfDocument, currentPage, scale]);

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) setCurrentPage(currentPage + 1);
  };

  const zoomIn = () => setScale(prevScale => Math.min(prevScale + 0.2, 3));
  const zoomOut = () => setScale(prevScale => Math.max(prevScale - 0.2, 0.5));

  return (
    <div className="pdf-viewer-container">
      {loading ? (
        <div className="loading">Loading PDF...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          <div className="pdf-controls">
            <div className="page-navigation">
              <button onClick={goToPreviousPage} disabled={currentPage <= 1}>
                &lt; Previous
              </button>
              <span>
                Page {currentPage} of {numPages}
              </span>
              <button onClick={goToNextPage} disabled={currentPage >= numPages}>
                Next &gt;
              </button>
            </div>
            <div className="zoom-controls">
              <button onClick={zoomOut}>-</button>
              <span>{Math.round(scale * 100)}%</span>
              <button onClick={zoomIn}>+</button>
            </div>
          </div>

          <div className="pdf-canvas-wrapper">
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={3}
              wheel={{ step: 0.1 }}
              centerOnInit={true}
              limitToBounds={false}
              alignmentAnimation={{ sizeX: 0, sizeY: 0 }}
              doubleClick={{ disabled: true }}
            >
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="tools">
                    <button onClick={() => zoomIn()}>+</button>
                    <button onClick={() => zoomOut()}>-</button>
                    <button onClick={() => resetTransform()}>Reset</button>
                  </div>
                  <TransformComponent>
                    <canvas ref={canvasRef} className="pdf-canvas" />
                  </TransformComponent>
                </>
              )}
            </TransformWrapper>
          </div>
        </>
      )}
    </div>
  );
};

export default PDFViewer;
