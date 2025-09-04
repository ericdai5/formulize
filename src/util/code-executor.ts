import { FormulizeConfig } from "../formulize";

// Global variable to track and cancel previous executions
let currentExecution: (() => void) | null = null;

/**
 * Execute user-provided JavaScript code in a sandboxed iframe to extract FormulizeConfig
 * Uses secure iframe sandboxing to prevent access to the main page context
 * Automatically cancels previous executions to prevent race conditions
 */
export async function executeUserCode(jsCode: string): Promise<FormulizeConfig | null> {
  // Cancel any previous execution
  if (currentExecution) {
    currentExecution();
    currentExecution = null;
  }
  // Function to deserialize config from iframe (handles function strings)
  const deserializeConfig = (
    config: Record<string, unknown>
  ): FormulizeConfig => {
    return JSON.parse(JSON.stringify(config), (key, value) => {
      if (value && typeof value === "object" && value.__isFunction) {
        try {
          // Reconstruct function from string
          return new Function("return " + value.__functionString)();
        } catch (e) {
          console.warn("Failed to deserialize function for key:", key, e);
          return value.__functionString; // fallback to string
        }
      }
      return value;
    });
  };

  return new Promise((resolve, reject) => {
    let isCompleted = false;
    
    // Create sandboxed iframe for secure code execution
    const iframe = document.createElement("iframe");
    iframe.setAttribute("sandbox", "allow-scripts");
    iframe.style.display = "none";

    // Cleanup function
    const cleanup = () => {
      if (isCompleted) return;
      isCompleted = true;
      
      window.removeEventListener("message", handleMessage);
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Clear current execution tracker
      if (currentExecution === cleanup) {
        currentExecution = null;
      }
    };

    // Store cleanup function for cancellation
    currentExecution = cleanup;

    // Set up message handler for communication between iframe and parent
    const handleMessage = (event: MessageEvent) => {
      // Verify the message is from our iframe
      if (event.source !== iframe.contentWindow || isCompleted) {
        return;
      }

      cleanup();

      // Handle the response from the iframe
      if (event.data.error) {
        console.error("Error from iframe:", event.data.error);
        reject(new Error(event.data.error));
      } else {
        // Deserialize the config to restore functions
        const config = deserializeConfig(event.data.config);

        if (!config) {
          reject(
            new Error(
              "No configuration was captured. Make sure your code calls Formulize.create(config)"
            )
          );
          return;
        }

        if (
          !config.formulas ||
          !config.variables ||
          !config.computation
        ) {
          reject(
            new Error(
              "Invalid configuration returned. Configuration must include formulas, variables, and computation properties."
            )
          );
          return;
        }

        resolve(config);
      }
    };

    window.addEventListener("message", handleMessage);

    // Create iframe content with user code embedded
    iframe.srcdoc = `
      <script>
        // Add global context for variables the code might use first
        const console = window.console;
        const Math = window.Math;
        
        // Function to serialize config for postMessage (handles functions)
        const serializeConfig = (config) => {
          return JSON.parse(JSON.stringify(config, (key, value) => {
            if (typeof value === 'function') {
              return {
                __isFunction: true,
                __functionString: value.toString()
              };
            }
            return value;
          }));
        };
        
        // Add global error handlers to catch syntax errors and other issues
        window.addEventListener('error', (event) => {
          console.error('Global error caught:', event.error || event.message);
          const errorMessage = event.error?.message || event.message || 'Unknown error occurred';
          parent.postMessage({ error: errorMessage }, '*');
          return true; // Prevent default error handling
        });
        
        window.addEventListener('unhandledrejection', (event) => {
          console.error('Unhandled promise rejection:', event.reason);
          const errorMessage = event.reason?.message || String(event.reason) || 'Promise rejection';
          parent.postMessage({ error: errorMessage }, '*');
          event.preventDefault(); // Prevent default rejection handling
        });
        
        // Wrap user code in async IIFE to handle await statements
        (async () => {
          try {
            // Execute the user's code in the sandboxed environment
            ${jsCode}
            
            // Try to extract the config variable from the global scope
            let extractedConfig = null;
            if (typeof config !== 'undefined') {
              extractedConfig = config;
            } else if (typeof window.config !== 'undefined') {
              extractedConfig = window.config;
            }
            
            // Serialize the config to handle functions before sending
            const serializedConfig = serializeConfig(extractedConfig);
            
            // Send the captured configuration back to the parent
            parent.postMessage({ config: serializedConfig }, '*');
          } catch (error) {
            console.error('Error in user code execution:', error);
            // Send any errors back to the parent for handling
            parent.postMessage({ error: error.message }, '*');
          }
        })();
      </script>
    `;

    // Set a timeout to prevent hanging if the iframe doesn't respond
    const timeoutId = setTimeout(() => {
      if (!isCompleted) {
        cleanup();
        reject(
          new Error(
            "Code execution timeout - check your code for infinite loops or blocking operations"
          )
        );
      }
    }, 5000); // 5 second timeout

    // Add iframe to document to start execution
    try {
      document.body.appendChild(iframe);
    } catch (error) {
      cleanup();
      reject(new Error("Failed to create iframe for code execution"));
    }
  });
}