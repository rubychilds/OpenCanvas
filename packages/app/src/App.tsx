import { useEffect, useRef, useState } from "react";
import type { Editor } from "grapesjs";
import { Canvas } from "./canvas/Canvas.js";
import { BridgeClient } from "./bridge/client.js";
import { buildHandlers } from "./bridge/handlers.js";

export function App() {
  const [connected, setConnected] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const clientRef = useRef<BridgeClient | null>(null);

  const handleEditor = (editor: Editor) => {
    editorRef.current = editor;
    setEditorReady(true);
  };

  useEffect(() => {
    if (!editorReady || !editorRef.current) return;
    const handlers = buildHandlers(editorRef.current);
    const client = new BridgeClient(handlers, {
      onStatus: setConnected,
    });
    clientRef.current = client;
    client.connect();
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, [editorReady]);

  return (
    <div className="oc-shell">
      <div className="oc-topbar">
        <span className="oc-topbar__title">OpenCanvas</span>
        <span style={{ color: "#5a6270", fontSize: 11 }}>v0.1-dev</span>
        <div className="oc-topbar__status">
          <span className={`oc-topbar__dot${connected ? " oc-topbar__dot--connected" : ""}`} />
          <span>{connected ? "Bridge connected" : "Bridge disconnected"}</span>
        </div>
      </div>

      <aside className="oc-panel">
        <h2 className="oc-panel__title">Layers</h2>
        <p style={{ color: "#5a6270" }}>Layer tree — coming in Story 1.3</p>
      </aside>

      <main className="oc-canvas">
        <Canvas onEditor={handleEditor} />
      </main>

      <aside className="oc-panel oc-panel--right">
        <h2 className="oc-panel__title">Style</h2>
        <p style={{ color: "#5a6270" }}>Style panel — coming in Story 1.3 / 1.6</p>
      </aside>
    </div>
  );
}
