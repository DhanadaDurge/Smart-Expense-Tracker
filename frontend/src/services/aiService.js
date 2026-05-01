const { execFile } = require("child_process");
const path = require("path");

const PYTHON_SCRIPT = path.join(__dirname, "ai_parser.py");

/**
 * Executes the Python AI Parser
 */
function runPythonAI(command, data) {
    return new Promise((resolve, reject) => {
        const child = execFile("python", [PYTHON_SCRIPT, command], { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error("Python Execution Error:", error);
                return reject(error);
            }
            if (stderr) {
                console.error("Python Stderr:", stderr);
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                if (parsed.error) {
                    return reject(new Error(parsed.error));
                }
                resolve(parsed);
            } catch (err) {
                console.error("Failed to parse Python stdout:", stdout);
                reject(new Error("Invalid JSON from Python script"));
            }
        });
        
        // Write the data to stdin securely
        if (data) {
            child.stdin.write(data);
        }
        child.stdin.end();
    });
}

/**
 * Parses a single SMS text into JSON using Python ML bridge
 */
async function parseExpenseSMS(text) {
    return await runPythonAI("sms", text);
}

/**
 * Parses a raw CSV string into a clean Array of JSONs using Python ML bridge
 */
async function parseCSVSheet(csvData) {
    // Only send first 50 lines to keep buffer clean
    const lines = csvData.split(/\r?\n/).slice(0, 50).join("\n"); 
    return await runPythonAI("csv", lines);
}

module.exports = {
    parseExpenseSMS,
    parseCSVSheet
};
