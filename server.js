import express from "express";
import expressWs from "express-ws";
import { v4 } from "uuid";
import Delta from "quill-delta";
import { faker } from "@faker-js/faker";
import randomColor from "randomcolor"; // import the script

const app = express();
expressWs(app);

// Store the document content and change history as Quill deltas
const document = {
  content: new Delta([{ insert: "Hello world" }]), // Initialize with an empty document
  history: [],
};

// WebSocket connections storage
const clients = new Map();

// Broadcast changes to all connected clients
function broadcastChange(exceptClientId, type, data) {
  clients.forEach((user, clientId) => {
    if (clientId !== exceptClientId) {
      user.ws.send(JSON.stringify({ type, data }));
    }
  });
}

function sendTo(ws, type, data) {
  ws.send(JSON.stringify({ type, data }));
}

app.ws("/editor", (ws) => {
  console.log("client connected");
  const clientId = v4();
  const user = {
    id: clientId,
    name: faker.person.fullName(),
    color: randomColor(),
  };
  clients.set(clientId, {
    ws,
    user,
  });

  // Send the current document content to the new client
  ws.on("message", (msg) => {
    const { type, data } = JSON.parse(msg);
    switch (type) {
      case "CHANGE": {
        // Apply the delta to the document
        document.content = document.content.compose(new Delta(data));

        // Store the delta in the change history
        document.history.push(data);

        // Broadcast the change to all clients
        broadcastChange(clientId, "CHANGE", data);
        break;
      }
      case "LOGIN": {
        sendTo(ws, "AUTHENTICATED", user);

        const arr = Array.from(clients);
        sendTo(
          ws,
          "USER_LIST",
          arr
            .filter((item) => item[0] !== clientId)
            .map((item) => ({
              user: item[1].user,
              selection: item[1].selection,
            }))
        );
        sendTo(ws, "INIT", document.content);
        broadcastChange(clientId, "USER_JOINED", user);
        break;
      }
      case "USER_CURSOR_CHANGED": {
        const client = clients.get(clientId);
        client.selection = data.selection;
        clients.set(clientId, client);
        broadcastChange(clientId, "USER_CURSOR_CHANGED", data);
        break;
      }
    }
  });

  ws.on("close", () => {
    clients.delete(clientId);
    broadcastChange(clientId, "USER_LEAVED", { id: clientId });
  });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
