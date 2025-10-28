import { useContext } from "react";

import { MathJaxContext } from "./MathJaxLoader";

export const useMathJax = () => useContext(MathJaxContext);
