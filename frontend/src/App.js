import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MicrobiomeChat from "./components/MicrobiomeChat";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MicrobiomeChat />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;