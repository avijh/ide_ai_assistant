const API_KEY = ""; // Get yours at https://platform.sulu.sh/apis/judge0

const AUTH_HEADERS = API_KEY ? {
    "Authorization": `Bearer ${API_KEY}`
} : {};

let OPENROUTER_API_KEY = localStorage.getItem("OPENROUTER_API_KEY") || '';

function setOpenRouterApiKey(key) {
    localStorage.setItem("OPENROUTER_API_KEY", key);
    OPENROUTER_API_KEY = key;
}

const CE = "CE";
const EXTRA_CE = "EXTRA_CE";

const AUTHENTICATED_CE_BASE_URL = "https://judge0-ce.p.sulu.sh";
const AUTHENTICATED_EXTRA_CE_BASE_URL = "https://judge0-extra-ce.p.sulu.sh";

var AUTHENTICATED_BASE_URL = {};
AUTHENTICATED_BASE_URL[CE] = AUTHENTICATED_CE_BASE_URL;
AUTHENTICATED_BASE_URL[EXTRA_CE] = AUTHENTICATED_EXTRA_CE_BASE_URL;

const UNAUTHENTICATED_CE_BASE_URL = "https://ce.judge0.com";
const UNAUTHENTICATED_EXTRA_CE_BASE_URL = "https://extra-ce.judge0.com";

var UNAUTHENTICATED_BASE_URL = {};
UNAUTHENTICATED_BASE_URL[CE] = UNAUTHENTICATED_CE_BASE_URL;
UNAUTHENTICATED_BASE_URL[EXTRA_CE] = UNAUTHENTICATED_EXTRA_CE_BASE_URL;

const INITIAL_WAIT_TIME_MS = 0;
const WAIT_TIME_FUNCTION = i => 100;
const MAX_PROBE_REQUESTS = 50;

var fontSize = 13;

var layout;

var sourceEditor;
var stdinEditor;
var stdoutEditor;

var $selectLanguage;
var $compilerOptions;
var $commandLineArguments;
var $runBtn;
var $statusLine;

var timeStart;
var timeEnd;

var sqliteAdditionalFiles;
var languages = {};

var layoutConfig = {
    settings: {
        showPopoutIcon: false,
        reorderEnabled: true
    },
    content: [{
        type: "row",
        content: [{
            type: "component",
            width: 50,
            componentName: "source",
            id: "source",
            title: "Source Code",
            isClosable: false,
            componentState: {
                readOnly: false
            }
        }, {
            type: "column",
            content: [{
                type: "component",
                componentName: "stdin",
                id: "stdin",
                title: "Input",
                isClosable: false,
                componentState: {
                    readOnly: false
                }
            }, {
                type: "component",
                componentName: "stdout",
                id: "stdout",
                title: "Output",
                isClosable: false,
                componentState: {
                    readOnly: true
                }
            }]
        }, {
            type: "column",
            content: [{
                type: "component",
                componentName: "ai",
                id: "ai",
                title: "Code Assistant",
                isClosable: false,

                componentState: {
                    readOnly: false
                }
            }]
        }]
    }]
};

const PUTER = puter.env === "app";
var gPuterFile;

function getAIContainerHTML() {
    return `
                <div style="display: flex; flex-direction: column; height: 100%; padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="text" style="margin-right: 10px;">API Key:</span>
                        <input type="password" id="api-key-input" style="flex-grow: 1; padding: 4px;" value="${OPENROUTER_API_KEY}">
                        <button 
                            type="button" 
                            id="save-api-key-btn" 
                            style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px;"
                        >
                            Save Key
                        </button>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 10px;">
                        <span for="ai-model-select" class="text" style="margin-right: 10px;">Select model: </span>
                        <select id="ai-model-select" style="margin-left: 10px;">
                            <option value="google/gemini-2.0-flash-thinking-exp:free">Google: Gemini 2.0 Flash Thinking Experimental 01-21 (free)</option>
                            <option value="deepseek/deepseek-r1-distill-llama-70b:free">DeepSeek: R1 Distill Llama 70B (free)</option>
                            <option value="meta-llama/llama-3.3-70b-instruct:free">Meta: Llama 3.3 70B Instruct (free)</option>
                            <option value="google/gemma-2-9b-it:free">Google: Gemma 2 9B (free)</option>
                            <option value="mistralai/mistral-7b-instruct:free">Mistral: Mistral 7B Instruct (free)</option>
                        </select>
                    </div>

                    <!-- AI Chat DIV -->
                    <div id="ai-chat" style="flex-grow: 1; border: 1px solid #ccc; padding: 10px; overflow-y: auto; margin-bottom: 10px;">
                        <!-- AI chat (prompt and response) will be displayed here -->
                    </div>

                    <form id="ai-prompt-form" style="margin-top: 10px;">
                        <div style="display: flex; gap: 10px;">
                            <textarea 
                                id="ai-prompt-input" 
                                placeholder="How can I help" 
                                style="flex-grow: 1; height: 90px; resize: vertical;"
                            >How would you improve this code?</textarea>
                            <button 
                                type="submit" 
                                style="height: 90px; padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; display: flex; align-items: center; gap: 8px;"
                            >
                                <img src="images/paper-plane-origami-svgrepo-com.svg" style="width: 24px; height: 24px; filter: invert(1);">
                            </button>
                        </div>
                    </form>
                </div>
            `;
}

async function sendRequestToModel() { 
    
    const prompt = document.getElementById('ai-prompt-input').value;
    const model = document.getElementById('ai-model-select').value;
    
    const codeContext = {
        source_code: sourceEditor.getValue(),
        stdin: stdinEditor.getValue(),
        stdout: stdoutEditor.getValue()
    }
    
    console.log("Prompt submitted:", prompt, "Model selected:", model, "Code Context:", codeContext, "API Key:", OPENROUTER_API_KEY);
    
    // Display thinking message
    const aiChat = document.getElementById('ai-chat');
    aiChat.insertAdjacentHTML('beforeend', 
        '<div id="thinking-message" class="thinking-message">Thinking...</div>'
    );

    // Call the OpenRouter API
    const response = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            messages: [
                { 
                    role: "system", 
                    content: `You are a coding assistant that can answer questions about the code.
                                You are given a prompt and you need to answer the prompt. 
                                Provide clear, concise and accurate responses to the code.
                                You can use the code to answer the prompt.
                                Do not make up an answer, only use the code to answer the user prompt.
                                If you include any code in your response, be sure to enclose it in a code block.
                                If the user prompt is not related to the code, just say "I'm sorry, I can only answer questions about the code."
                                Here is the code context:
                                Source Code: ${codeContext.source_code}
                                Stdin: ${codeContext.stdin}
                                Stdout: ${codeContext.stdout}
                                ` 
                },
                {
                    role: "user",
                    content: `Here is the user prompt: <user_prompt>${prompt}</user_prompt> `
                }
            ]
        })
    }); // fetch request to openrouter

    console.log("Response inside function:", response);
    return response;
}

function addSelectionToChat() {
    const selection = sourceEditor.getSelection();
    const model = sourceEditor.getModel();
    const selectedText = model.getValueInRange(selection);

    console.log("Start Line Number: ", selection.startLineNumber, "End Line Number: ", selection.endLineNumber, "Selected text:", selectedText);

    const currentPrompt = document.getElementById('ai-prompt-input').value;
    const formattedText = `/* Selected code (lines ${selection.startLineNumber}-${selection.endLineNumber}): */\n<code>${selectedText}</code>\n\n`;
    document.getElementById('ai-prompt-input').value = formattedText + currentPrompt;
}

function encode(str) {
    return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    var escaped = escape(atob(bytes || ""));
    try {
        return decodeURIComponent(escaped);
    } catch {
        return unescape(escaped);
    }
}

function showError(title, content) {
    $("#judge0-site-modal #title").html(title);
    $("#judge0-site-modal .content").html(content);

    let reportTitle = encodeURIComponent(`Error on ${window.location.href}`);
    let reportBody = encodeURIComponent(
        `**Error Title**: ${title}\n` +
        `**Error Timestamp**: \`${new Date()}\`\n` +
        `**Origin**: ${window.location.href}\n` +
        `**Description**:\n${content}`
    );

    $("#report-problem-btn").attr("href", `https://github.com/judge0/ide/issues/new?title=${reportTitle}&body=${reportBody}`);
    $("#judge0-site-modal").modal("show");
}

function showHttpError(jqXHR) {
    showError(`${jqXHR.statusText} (${jqXHR.status})`, `<pre>${JSON.stringify(jqXHR, null, 4)}</pre>`);
}

function handleRunError(jqXHR) {
    showHttpError(jqXHR);
    $runBtn.removeClass("disabled");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "runError",
        data: jqXHR
    })), "*");
}

function handleResult(data) {
    const tat = Math.round(performance.now() - timeStart);
    console.log(`It took ${tat}ms to get submission result.`);

    const status = data.status;
    const stdout = decode(data.stdout);
    const compileOutput = decode(data.compile_output);
    const time = (data.time === null ? "-" : data.time + "s");
    const memory = (data.memory === null ? "-" : data.memory + "KB");

    $statusLine.html(`${status.description}, ${time}, ${memory} (TAT: ${tat}ms)`);

    const output = [compileOutput, stdout].join("\n").trim();

    stdoutEditor.setValue(output);

    $runBtn.removeClass("disabled");

    window.top.postMessage(JSON.parse(JSON.stringify({
        event: "postExecution",
        status: data.status,
        time: data.time,
        memory: data.memory,
        output: output
    })), "*");
}

async function getSelectedLanguage() {
    return getLanguage(getSelectedLanguageFlavor(), getSelectedLanguageId())
}

function getSelectedLanguageId() {
    return parseInt($selectLanguage.val());
}

function getSelectedLanguageFlavor() {
    return $selectLanguage.find(":selected").attr("flavor");
}

function run() {
    if (sourceEditor.getValue().trim() === "") {
        showError("Error", "Source code can't be empty!");
        return;
    } else {
        $runBtn.addClass("disabled");
    }

    stdoutEditor.setValue("");
    $statusLine.html("");

    let x = layout.root.getItemsById("stdout")[0];
    x.parent.header.parent.setActiveContentItem(x);

    let sourceValue = encode(sourceEditor.getValue());
    let stdinValue = encode(stdinEditor.getValue());
    let languageId = getSelectedLanguageId();
    let compilerOptions = $compilerOptions.val();
    let commandLineArguments = $commandLineArguments.val();

    let flavor = getSelectedLanguageFlavor();

    if (languageId === 44) {
        sourceValue = sourceEditor.getValue();
    }

    let data = {
        source_code: sourceValue,
        language_id: languageId,
        stdin: stdinValue,
        compiler_options: compilerOptions,
        command_line_arguments: commandLineArguments,
        redirect_stderr_to_stdout: true
    };

    let sendRequest = function (data) {
        window.top.postMessage(JSON.parse(JSON.stringify({
            event: "preExecution",
            source_code: sourceEditor.getValue(),
            language_id: languageId,
            flavor: flavor,
            stdin: stdinEditor.getValue(),
            compiler_options: compilerOptions,
            command_line_arguments: commandLineArguments
        })), "*");

        timeStart = performance.now();
        $.ajax({
            url: `${AUTHENTICATED_BASE_URL[flavor]}/submissions?base64_encoded=true&wait=false`,
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(data),
            headers: AUTH_HEADERS,
            success: function (data, textStatus, request) {
                console.log(`Your submission token is: ${data.token}`);
                let region = request.getResponseHeader('X-Judge0-Region');
                setTimeout(fetchSubmission.bind(null, flavor, region, data.token, 1), INITIAL_WAIT_TIME_MS);
            },
            error: handleRunError
        });
    }

    if (languageId === 82) {
        if (!sqliteAdditionalFiles) {
            $.ajax({
                url: `./data/additional_files_zip_base64.txt`,
                contentType: "text/plain",
                success: function (responseData) {
                    sqliteAdditionalFiles = responseData;
                    data["additional_files"] = sqliteAdditionalFiles;
                    sendRequest(data);
                },
                error: handleRunError
            });
        }
        else {
            data["additional_files"] = sqliteAdditionalFiles;
            sendRequest(data);
        }
    } else {
        sendRequest(data);
    }
} //run()

function fetchSubmission(flavor, region, submission_token, iteration) {
    if (iteration >= MAX_PROBE_REQUESTS) {
        handleRunError({
            statusText: "Maximum number of probe requests reached.",
            status: 504
        }, null, null);
        return;
    }

    $.ajax({
        url: `${UNAUTHENTICATED_BASE_URL[flavor]}/submissions/${submission_token}?base64_encoded=true`,
        headers: {
            "X-Judge0-Region": region
        },
        success: function (data) {
            if (data.status.id <= 2) { // In Queue or Processing
                $statusLine.html(data.status.description);
                setTimeout(fetchSubmission.bind(null, flavor, region, submission_token, iteration + 1), WAIT_TIME_FUNCTION(iteration));
            } else {
                handleResult(data);
            }
        },
        error: handleRunError
    });
}

function setSourceCodeName(name) {
    $(".lm_title")[0].innerText = name;
}

function getSourceCodeName() {
    return $(".lm_title")[0].innerText;
}

function openFile(content, filename) {
    clear();
    sourceEditor.setValue(content);
    selectLanguageForExtension(filename.split(".").pop());
    setSourceCodeName(filename);
}

function saveFile(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
}

async function openAction() {
    if (PUTER) {
        gPuterFile = await puter.ui.showOpenFilePicker();
        openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
    } else {
        document.getElementById("open-file-input").click();
    }
}

async function saveAction() {
    if (PUTER) {
        if (gPuterFile) {
            gPuterFile.write(sourceEditor.getValue());
        } else {
            gPuterFile = await puter.ui.showSaveFilePicker(sourceEditor.getValue(), getSourceCodeName());
            setSourceCodeName(gPuterFile.name);
        }
    } else {
        saveFile(sourceEditor.getValue(), getSourceCodeName());
    }
}

function setFontSizeForAllEditors(fontSize) {
    sourceEditor.updateOptions({ fontSize: fontSize });
    stdinEditor.updateOptions({ fontSize: fontSize });
    stdoutEditor.updateOptions({ fontSize: fontSize });
}

async function loadLangauges() {
    return new Promise((resolve, reject) => {
        let options = [];

        $.ajax({
            url: UNAUTHENTICATED_CE_BASE_URL + "/languages",
            success: function (data) {
                for (let i = 0; i < data.length; i++) {
                    let language = data[i];
                    let option = new Option(language.name, language.id);
                    option.setAttribute("flavor", CE);
                    option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                    if (language.id !== 89) {
                        options.push(option);
                    }

                    if (language.id === DEFAULT_LANGUAGE_ID) {
                        option.selected = true;
                    }
                }
            },
            error: reject
        }).always(function () {
            $.ajax({
                url: UNAUTHENTICATED_EXTRA_CE_BASE_URL + "/languages",
                success: function (data) {
                    for (let i = 0; i < data.length; i++) {
                        let language = data[i];
                        let option = new Option(language.name, language.id);
                        option.setAttribute("flavor", EXTRA_CE);
                        option.setAttribute("langauge_mode", getEditorLanguageMode(language.name));

                        if (options.findIndex((t) => (t.text === option.text)) === -1 && language.id !== 89) {
                            options.push(option);
                        }
                    }
                },
                error: reject
            }).always(function () {
                options.sort((a, b) => a.text.localeCompare(b.text));
                $selectLanguage.append(options);
                resolve();
            });
        });
    });
};

async function loadSelectedLanguage(skipSetDefaultSourceCodeName = false) {
    monaco.editor.setModelLanguage(sourceEditor.getModel(), $selectLanguage.find(":selected").attr("langauge_mode"));

    if (!skipSetDefaultSourceCodeName) {
        setSourceCodeName((await getSelectedLanguage()).source_file);
    }
}

function selectLanguageByFlavorAndId(languageId, flavor) {
    let option = $selectLanguage.find(`[value=${languageId}][flavor=${flavor}]`);
    if (option.length) {
        option.prop("selected", true);
        $selectLanguage.trigger("change", { skipSetDefaultSourceCodeName: true });
    }
}

function selectLanguageForExtension(extension) {
    let language = getLanguageForExtension(extension);
    selectLanguageByFlavorAndId(language.language_id, language.flavor);
}

async function getLanguage(flavor, languageId) {
    return new Promise((resolve, reject) => {
        if (languages[flavor] && languages[flavor][languageId]) {
            resolve(languages[flavor][languageId]);
            return;
        }

        $.ajax({
            url: `${UNAUTHENTICATED_BASE_URL[flavor]}/languages/${languageId}`,
            success: function (data) {
                if (!languages[flavor]) {
                    languages[flavor] = {};
                }

                languages[flavor][languageId] = data;
                resolve(data);
            },
            error: reject
        });
    });
}

function setDefaults() {
    setFontSizeForAllEditors(fontSize);
    sourceEditor.setValue(DEFAULT_SOURCE);
    stdinEditor.setValue(DEFAULT_STDIN);
    $compilerOptions.val(DEFAULT_COMPILER_OPTIONS);
    $commandLineArguments.val(DEFAULT_CMD_ARGUMENTS);

    $statusLine.html("");

    loadSelectedLanguage();
}

function clear() {
    sourceEditor.setValue("");
    stdinEditor.setValue("");
    $compilerOptions.val("");
    $commandLineArguments.val("");

    $statusLine.html("");
}

function refreshSiteContentHeight() {
    const navigationHeight = $("#judge0-site-navigation").outerHeight();
    $("#judge0-site-content").height($(window).height() - navigationHeight);
    $("#judge0-site-content").css("padding-top", navigationHeight);
}

function refreshLayoutSize() {
    refreshSiteContentHeight();
    layout.updateSize();
}

$(window).resize(refreshLayoutSize);

$(document).ready(async function () {
    $("#select-language").dropdown();
    $("[data-content]").popup({
        lastResort: "left center"
    });

    refreshSiteContentHeight();

    console.log("Hey, Judge0 IDE is open-sourced: https://github.com/judge0/ide. Have fun!");

    $selectLanguage = $("#select-language");
    $selectLanguage.change(function (event, data) {
        let skipSetDefaultSourceCodeName = (data && data.skipSetDefaultSourceCodeName) || !!gPuterFile;
        loadSelectedLanguage(skipSetDefaultSourceCodeName);
    });

    await loadLangauges();

    $compilerOptions = $("#compiler-options");
    $commandLineArguments = $("#command-line-arguments");

    $runBtn = $("#run-btn");
    $runBtn.click(run);
    
 

    $("#open-file-input").change(function (e) {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const reader = new FileReader();
            reader.onload = function (e) {
                openFile(e.target.result, selectedFile.name);
            };

            reader.onerror = function (e) {
                showError("Error", "Error reading file: " + e.target.error);
            };

            reader.readAsText(selectedFile);
        }
    });

    $statusLine = $("#judge0-status-line");

    $(document).on("keydown", "body", function (e) {
        if (e.metaKey || e.ctrlKey) {
            switch (e.key) {
                case "Enter": // Ctrl+Enter, Cmd+Enter
                    e.preventDefault();
                    run();
                    break;
                case "s": // Ctrl+S, Cmd+S
                    e.preventDefault();
                    save();
                    break;
                case "o": // Ctrl+O, Cmd+O
                    e.preventDefault();
                    open();
                    break;
                case "+": // Ctrl+Plus
                case "=": // Some layouts use '=' for '+'
                    e.preventDefault();
                    fontSize += 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "-": // Ctrl+Minus
                    e.preventDefault();
                    fontSize -= 1;
                    setFontSizeForAllEditors(fontSize);
                    break;
                case "0": // Ctrl+0
                    e.preventDefault();
                    fontSize = 13;
                    setFontSizeForAllEditors(fontSize);
                    break;
            }
        }
    });

    require(["vs/editor/editor.main"], function (ignorable) {
        layout = new GoldenLayout(layoutConfig, $("#judge0-site-content"));

        layout.registerComponent("source", function (container, state) {
            sourceEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: true,
                readOnly: state.readOnly,
                language: "cpp",
                fontFamily: "JetBrains Mono",
                minimap: {
                    enabled: true
                }
            });

            sourceEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
        });

        layout.registerComponent("stdin", function (container, state) {
            stdinEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                fontFamily: "JetBrains Mono",
                minimap: {
                    enabled: false
                }
            });
        });

        layout.registerComponent("stdout", function (container, state) {
            stdoutEditor = monaco.editor.create(container.getElement()[0], {
                automaticLayout: true,
                scrollBeyondLastLine: false,
                readOnly: state.readOnly,
                language: "plaintext",
                fontFamily: "JetBrains Mono",
                minimap: {
                    enabled: false
                }
            });
        });
        
        // Register the AI chat component
        layout.registerComponent("ai", function (container, state) {
            // Create a container for the AI chat UI
            const aiContainer = container.getElement()[0];
            aiContainer.innerHTML = getAIContainerHTML();
        });

        layout.on("initialised", function () {
            setDefaults();
            refreshLayoutSize();
            
            sourceEditor.onDidChangeCursorSelection((e) => {
                const selection = sourceEditor.getSelection();
                const menu = document.getElementById('selection-menu');
                
                if (!selection.isEmpty()) {
                    const pos = sourceEditor.getScrolledVisiblePosition(selection.getStartPosition());
                    const coords = sourceEditor.getScrolledVisiblePosition(selection.getStartPosition());
                    const editorDomNode = sourceEditor.getDomNode();
                    const editorRect = editorDomNode.getBoundingClientRect();
                    
                    menu.style.display = 'block';
                    menu.style.position = 'absolute';
                    menu.style.left = `${editorRect.left + coords.left}px`;
                    menu.style.top = `${editorRect.top + coords.top - 30}px`;
                } else {
                    menu.style.display = 'none';
                }
            });

            // Add an event listener for the save key button
            document.getElementById('save-api-key-btn').addEventListener('click', function() {
                const apiKey = document.getElementById('api-key-input').value;
                setOpenRouterApiKey(apiKey);
            });

             // Add event listener for form submission
            document.getElementById('ai-prompt-form').addEventListener('submit', async function(event) {
                event.preventDefault(); // Prevent default form submission        

                // Send the request to the model    
                const response = await sendRequestToModel();
                const responseData = await response.json();

                if (responseData.choices && responseData.choices.length > 0 && responseData.choices[0].message && responseData.choices[0].message.content) {
                    console.log("Response Content (using choices):", responseData.choices[0].message.content);
                    // Display the response
                    const aiChat = document.getElementById('ai-chat');

                    const responseContent = responseData.choices[0].message.content;
                    //const htmlContent = markdownToHTML(responseContent); // Convert markdown to HTML
                    const htmlContent = marked.parse(responseContent); // Convert markdown to HTML
                    const userPrompt = document.getElementById('ai-prompt-input').value;
                    //console.log("HTML Content:", htmlContent);

                    // Remove the thinking message after the request is sent
                    const thinkingMessage = document.getElementById('thinking-message');
                    if (thinkingMessage) {
                        thinkingMessage.remove();
                    }

                    // Add the user prompt and response to the chat
                    const model = document.getElementById('ai-model-select').value;
                    aiChat.innerHTML += `<div class='user-prompt'><strong>${userPrompt}</strong><br/>Model: ${model}</div>`;
                    aiChat.innerHTML += `<div class='ai-response'>${htmlContent}</div>`;
                } else {
                    console.log("No response content found");
                    console.log("Response:", response);
                }
                // Clear the input after submission
                document.getElementById('ai-prompt-input').value = '';

                window.top.postMessage({ event: "initialised" }, "*");
                
            });
        }); //layout.on()

        layout.init();

        // Observer setup to detect errors in the stdout
        const stdoutObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                const stdoutContent = stdoutEditor.getValue().toLowerCase();
                if (stdoutContent.includes("error") || stdoutContent.includes("exception")) {
                    console.log("Error detected:", stdoutContent);
                    // Add your error handling logic here
                }
            });
        }); //stdout Observer

        // Start observing when run button is clicked
        document.getElementById('run-btn').addEventListener('click', () => {
            //console.log("Run button clicked");
            // Configure observer to watch for text changes
            stdoutObserver.observe(stdoutEditor.getContainerDomNode(), {
                childList: true,
                subtree: true,
                characterData: true
            });
            
            // Disconnect after 5s to prevent memory leaks
            setTimeout(() => stdoutObserver.disconnect(), 5000);
        }); //run button click event listener

    });

    let superKey = "⌘";
    if (!/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
        superKey = "Ctrl";
    }

    [$runBtn].forEach(btn => {
        btn.attr("data-content", `${superKey}${btn.attr("data-content")}`);
    });

    document.querySelectorAll(".description").forEach(e => {
        e.innerText = `${superKey}${e.innerText}`;
    });

    if (PUTER) {
        puter.ui.onLaunchedWithItems(async function (items) {
            gPuterFile = items[0];
            openFile(await (await gPuterFile.read()).text(), gPuterFile.name);
        });
        applyMinimalStyleMode();
    }

    window.onmessage = function (e) {
        if (!e.data) {
            return;
        }

        if (e.data.action === "get") {
            window.top.postMessage(JSON.parse(JSON.stringify({
                event: "getResponse",
                source_code: sourceEditor.getValue(),
                language_id: getSelectedLanguageId(),
                flavor: getSelectedLanguageFlavor(),
                stdin: stdinEditor.getValue(),
                stdout: stdoutEditor.getValue(),
                compiler_options: $compilerOptions.val(),
                command_line_arguments: $commandLineArguments.val()
            })), "*");
        } else if (e.data.action === "set") {
            if (e.data.source_code) {
                sourceEditor.setValue(e.data.source_code);
            }
            if (e.data.language_id && e.data.flavor) {
                selectLanguageByFlavorAndId(e.data.language_id, e.data.flavor);
            }
            if (e.data.stdin) {
                stdinEditor.setValue(e.data.stdin);
            }
            if (e.data.stdout) {
                stdoutEditor.setValue(e.data.stdout);
            }
            if (e.data.compiler_options) {
                $compilerOptions.val(e.data.compiler_options);
            }
            if (e.data.command_line_arguments) {
                $commandLineArguments.val(e.data.command_line_arguments);
            }
            if (e.data.api_key) {
                AUTH_HEADERS["Authorization"] = `Bearer ${e.data.api_key}`;
            }
        }
    };
});

const DEFAULT_SOURCE = `
<?php

// 1. Generate random array
$unsortedList = [];
for ($i = 0; $i < 10; $i++) {
    $unsortedList[] = rand(0, 99); // Generates a random integer between 0 and 99 (inclusive)
}

// 2. Print unsorted list
echo "Unsorted list: ";
print_r($unsortedList); // print_r is useful for displaying arrays
echo "<br>"; // Add a line break for better formatting

// 3. Sort the array
sort($unsortedList); // Sorts the array in place

// 4. Print sorted list
echo "Sorted list: ";
print_r($unsortedList);
echo "<br>";

?>`;

const DEFAULT_STDIN = "";

const DEFAULT_COMPILER_OPTIONS = "";
const DEFAULT_CMD_ARGUMENTS = "";
const DEFAULT_LANGUAGE_ID = 98; // PHP (8.3.11) (https://ce.judge0.com/languages/98)

function getEditorLanguageMode(languageName) {
    const DEFAULT_EDITOR_LANGUAGE_MODE = "plaintext";
    const LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE = {
        "Bash": "shell",
        "C": "c",
        "C3": "c",
        "C#": "csharp",
        "C++": "cpp",
        "Clojure": "clojure",
        "F#": "fsharp",
        "Go": "go",
        "Java": "java",
        "JavaScript": "javascript",
        "Kotlin": "kotlin",
        "Objective-C": "objective-c",
        "Pascal": "pascal",
        "Perl": "perl",
        "PHP": "php",
        "Python": "python",
        "R": "r",
        "Ruby": "ruby",
        "SQL": "sql",
        "Swift": "swift",
        "TypeScript": "typescript",
        "Visual Basic": "vb"
    }

    for (let key in LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE) {
        if (languageName.toLowerCase().startsWith(key.toLowerCase())) {
            return LANGUAGE_NAME_TO_LANGUAGE_EDITOR_MODE[key];
        }
    }
    return DEFAULT_EDITOR_LANGUAGE_MODE;
}

const EXTENSIONS_TABLE = {
    "asm": { "flavor": CE, "language_id": 45 }, // Assembly (NASM 2.14.02)
    "c": { "flavor": CE, "language_id": 103 }, // C (GCC 14.1.0)
    "cpp": { "flavor": CE, "language_id": 105 }, // C++ (GCC 14.1.0)
    "cs": { "flavor": EXTRA_CE, "language_id": 29 }, // C# (.NET Core SDK 7.0.400)
    "go": { "flavor": CE, "language_id": 95 }, // Go (1.18.5)
    "java": { "flavor": CE, "language_id": 91 }, // Java (JDK 17.0.6)
    "js": { "flavor": CE, "language_id": 102 }, // JavaScript (Node.js 22.08.0)
    "lua": { "flavor": CE, "language_id": 64 }, // Lua (5.3.5)
    "pas": { "flavor": CE, "language_id": 67 }, // Pascal (FPC 3.0.4)
    "php": { "flavor": CE, "language_id": 98 }, // PHP (8.3.11)
    "py": { "flavor": EXTRA_CE, "language_id": 25 }, // Python for ML (3.11.2)
    "r": { "flavor": CE, "language_id": 99 }, // R (4.4.1)
    "rb": { "flavor": CE, "language_id": 72 }, // Ruby (2.7.0)
    "rs": { "flavor": CE, "language_id": 73 }, // Rust (1.40.0)
    "scala": { "flavor": CE, "language_id": 81 }, // Scala (2.13.2)
    "sh": { "flavor": CE, "language_id": 46 }, // Bash (5.0.0)
    "swift": { "flavor": CE, "language_id": 83 }, // Swift (5.2.3)
    "ts": { "flavor": CE, "language_id": 101 }, // TypeScript (5.6.2)
    "txt": { "flavor": CE, "language_id": 43 }, // Plain Text
};

function getLanguageForExtension(extension) {
    return EXTENSIONS_TABLE[extension] || { "flavor": CE, "language_id": 43 }; // Plain Text (https://ce.judge0.com/languages/43)
}
