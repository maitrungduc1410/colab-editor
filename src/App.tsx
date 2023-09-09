import { Fragment, useEffect, useRef, useState } from "react";
import "./App.css";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import Delta from "quill-delta";
import { Menubar } from "primereact/menubar";
import { Avatar } from "primereact/avatar";
import { AvatarGroup } from "primereact/avatargroup";
import { Tag } from "primereact/tag";
import IQuillRange from "quill-cursors/dist/quill-cursors/i-range";
import { Tooltip } from "primereact/tooltip";

Quill.register("modules/cursors", QuillCursors);

interface User {
  id: string;
  color: string;
  name: string;
}

function App() {
  const [value, setValue] = useState<string | Delta>("");
  const [user, setUser] = useState<User | null>(null);
  const [listUsers, setListUsers] = useState<User[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const editorRef = useRef<ReactQuill>(null);
  const cursorRef = useRef<QuillCursors | null>(null);
  const isFirstChange = useRef(true);

  useEffect(() => {
    const cursors = editorRef.current!.editor!.getModule("cursors");

    cursorRef.current = cursors;
  }, []);

  useEffect(() => {
    wsRef.current = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${
        location.host
      }/api/editor` // this proxy path is configured in vite.config.js
    );

    wsRef.current.onopen = () => {
      wsRef.current!.send(
        JSON.stringify({
          type: "LOGIN",
        })
      );
    };

    wsRef.current.onmessage = (e) => {
      const { type, data } = JSON.parse(e.data);

      switch (type) {
        case "INIT": {
          setValue(data);
          break;
        }
        case "AUTHENTICATED": {
          setUser(data);
          cursorRef.current!.createCursor(data.id, data.name, data.color);
          break;
        }
        case "USER_LIST": {
          setListUsers(data.map((item: { user: User }) => item.user));
          data.forEach(
            ({ user, selection }: { user: User; selection?: IQuillRange }) => {
              cursorRef.current!.createCursor(user.id, user.name, user.color);
              if (selection) {
                cursorRef.current!.moveCursor(user.id, selection);
              }
            }
          );
          break;
        }
        case "USER_JOINED": {
          setListUsers([...listUsers, data]);
          cursorRef.current!.createCursor(data.id, data.name, data.color);
          break;
        }
        case "USER_LEAVED": {
          setListUsers(listUsers.filter((item: User) => item.id !== data.id));
          cursorRef.current!.removeCursor(data.id);
          break;
        }
        case "USER_CURSOR_CHANGED": {
          cursorRef.current!.moveCursor(data.userId, data.selection);
          break;
        }
        case "CHANGE": {
          editorRef.current?.editor?.updateContents(data, "api");
          break;
        }
      }
    };

    return () => {
      wsRef.current!.close();
      cursorRef.current!.clearCursors();
    };
  }, []);

  return (
    <>
      <Menubar
        model={[]}
        start={
          <AvatarGroup>
            {listUsers.map((item) => (
              <Fragment key={item.id}>
                <Tooltip
                  target={`#avatar_${item.id}`}
                  content={item.name}
                  position="top"
                ></Tooltip>
                <Avatar
                  id={`avatar_${item.id}`}
                  label={item.name.charAt(0)}
                  shape="circle"
                  style={{ backgroundColor: item.color }}
                  className="transition-all	transition-duration-200 border-2 border-transparent hover:border-primary"
                />
              </Fragment>
            ))}
          </AvatarGroup>
        }
        end={
          <Tag
            value={`Current user: ${user?.name || ""}`}
            style={{ backgroundColor: user?.color }}
          />
        }
      />

      <ReactQuill
        ref={editorRef}
        theme="snow"
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        value={value}
        onChange={(_value, delta, source) => {
          if (isFirstChange.current) {
            // we don't need to do anything on first change since this change is caused by server
            isFirstChange.current = false;
            return;
          }

          if (source !== "api") {
            wsRef.current!.send(
              JSON.stringify({
                type: "CHANGE",
                data: {
                  ops: delta.ops,
                },
              })
            );
          }
          setValue(_value);
        }}
        modules={{ cursors: true }}
        onChangeSelection={(selection) => {
          cursorRef.current!.moveCursor(user!.id, selection as IQuillRange);
          wsRef.current!.send(
            JSON.stringify({
              type: "USER_CURSOR_CHANGED",
              data: {
                userId: user!.id,
                selection,
              },
            })
          );
        }}
      />
    </>
  );
}

export default App;
