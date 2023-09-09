import { useRef, useState } from "react";
import "./App.css";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import Delta from "quill-delta";

Quill.register("modules/cursors", QuillCursors);

interface User {
  id: string;
  color: string;
  name: string;
}

function App() {
  const [value, setValue] = useState<string | Delta>("");
  const editorRef = useRef<ReactQuill>(null);

  return (
    <>
      <ReactQuill
        ref={editorRef}
        theme="snow"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        value={value}
        modules={{ cursors: true }}
      />
    </>
  );
}

export default App;
