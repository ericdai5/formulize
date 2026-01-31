import { useContext } from "react";

import { MathJaxContext } from "../internal/mathjax-loader";

export const useMathJax = () => useContext(MathJaxContext);
