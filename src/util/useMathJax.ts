import { useContext } from "react";

import { MathJaxContext } from "../internal/MathJaxLoader";

export const useMathJax = () => useContext(MathJaxContext);
