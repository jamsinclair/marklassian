import { Route, Routes } from "react-router";
import ApiReference from "./ApiReference";
import Layout from "./Layout";
import Playground from "./Playground";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ApiReference />} />
        <Route path="/playground" element={<Playground />} />
      </Route>
    </Routes>
  );
}

export default App;
