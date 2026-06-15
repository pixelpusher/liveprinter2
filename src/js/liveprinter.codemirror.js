/**
 * CodeMirror 6 configuration and editor creation for LivePrinter.
 * @module CodeMirror
 */

// CodeMirror 6
import {EditorState, EditorSelection, Prec} from "@codemirror/state"
import {
  EditorView, keymap, highlightSpecialChars, drawSelection,
  highlightActiveLine, dropCursor, rectangularSelection,
  crosshairCursor, lineNumbers, highlightActiveLineGutter
} from "@codemirror/view"
import {
  indentOnInput,
  bracketMatching, foldGutter, foldKeymap
} from "@codemirror/language"
import {
  defaultKeymap, history, historyKeymap,
  indentWithTab
} from "@codemirror/commands"
import {
  searchKeymap, highlightSelectionMatches
} from "@codemirror/search"
import {
  autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap
} from "@codemirror/autocomplete"
import {lintKeymap} from "@codemirror/lint"
import { javascript } from "@codemirror/lang-javascript";
import { lpDark } from "./lpDarkTheme.ts";
import { logInfo } from "./logging-utils.js";

// Define reasonable limits for editor document length in browser
const MAX_DOC_LENGTH = 5_000_000; // ~5MB or 5 million characters

/**
 * Get text of current line
 * @param {EditorView} view 
 * @returns {string} text of current line
 */
const selectLine = (view) => {
  // 1. Get the current cursor position
  const pos = view.state.selection.main.head;
  
  // 2. Find the line corresponding to this position
  const line = view.state.doc.lineAt(pos);
  
  // 3. Highlight the line visually
  view.dispatch({
    selection: EditorSelection.create([
      EditorSelection.range(line.from, line.to)
    ])
  });
  
  // 4. Extract the text
  return line.text;
};

/**
 * A lightweight debouncing helper
 */
function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Save editor text to localstorage key
 * @param {string} storageKey - Key for localStorage
 * @param {number} delay - Debounce delay in ms
 * @returns {Object} CodeMirror extension
 */
function createAutosaveExtension(storageKey, delay=500){
  
  const saveToStorage = debounce((storageKey, text) => {
    try {
      localStorage.setItem(storageKey, text);
    } catch (e) {
      e.message = `Failed updating editor ${storageKey} in localStorage (quota exceeded?) ${e.message}`;
      throw e;
    }
  }, delay); // 500ms pause threshold
  
  // Create the CodeMirror Update Listener extension
  const autoSaveExtension = EditorView.updateListener.of((update) => {
    // Only trigger a save if the actual document text changed
    if (update.docChanged) {
      // Accessing .toString() here is fine because it's debounced and isolated
      saveToStorage(storageKey, update.state.doc.toString());
    }
  });

  return autoSaveExtension;
}

/**
 * Create a lightweight CodeMirror editor for code editing
 * @param {Object} config - Configuration object
 * @param {string} config.id - Editor ID
 * @param {string} config.value - Initial code value
 * @param {HTMLElement} config.el - Parent element
 * @param {Function} config.onRun - Callback when code should be executed
 * @returns {Object} Editor object with value getter/setter and focus method
 */
export function createCodeMirrorEditor(config) {
  
  const state = EditorState.create({
    doc: config.value,
    extensions: [
      // A line number gutter
      lineNumbers(),
      // A gutter with code folding markers
      foldGutter(),
      // Replace non-printable characters with placeholders
      highlightSpecialChars(),
      // The undo history
      history(),
      // Replace native cursor/selection with our own
      drawSelection(),
      // Show a drop cursor when dragging over the editor
      dropCursor(),
      // Allow multiple cursors/selections
      EditorState.allowMultipleSelections.of(true),
      // Re-indent lines when typing specific input
      indentOnInput(),
      // Highlight matching brackets near cursor
      bracketMatching({ brackets: '()[]{}<>'}),
      // Automatically close brackets
      closeBrackets(),
      // Load the autocompletion system
      autocompletion(),
      // Allow alt-drag to select rectangular regions
      rectangularSelection(),
      // Change the cursor to a crosshair when holding alt
      crosshairCursor(),
      // Style the current line specially
      highlightActiveLine(),
      // Style the gutter for current line specially
      highlightActiveLineGutter(),
      // Highlight text that matches the selected text
      highlightSelectionMatches(),
      
      javascript(), 
      lpDark, 
      
      createAutosaveExtension(config.id, 500), // local storage saving extension defined by liveprinter
      
      keymap.of([
        // Closed-brackets aware backspace
        ...closeBracketsKeymap,
        // A large set of basic bindings
        ...defaultKeymap,
        // Search-related keys
        ...searchKeymap,
        // Redo/undo keys
        ...historyKeymap,
        // Code folding bindings
        ...foldKeymap,
        // Autocompletion keys
        ...completionKeymap,
        // Keys related to the linter system
        ...lintKeymap,
        indentWithTab,
      ]),
      Prec.highest(keymap.of([
        {
          key: 'Ctrl-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, false);
            return true;
          },
        },
        {
          key: 'Alt-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, false);
            return true;
          },
        },
        {
          key: 'Shift-Enter',
          run: (editorView) => {
            const selection = window.getSelection().toString();
            const text = selection || selectLine(editorView);
            config.onRun(text, true);
            return true;
          },
        },
      ])
    ),
  ],
});

const view = new EditorView({
  state,
  parent: config.el,
});

return {
  view,
  name: config.id,
  get value() {
    return view.state.doc.toString();
  },
  
  // add text to end of code editor
  append(text) {
    // Calculate the current length of the document
    const currentLength = view.state.doc.length;
    
    // Insert text at end
    view.dispatch({
      changes: {
        from: currentLength,
        insert: text,
      },
    });
    
    // Evaluate the resultant state length efficiently,
    // avoid toString() -- accessing .length on the tree 
    // is an O(1) operation
    if (view.state.doc.length > MAX_DOC_LENGTH) {
      logInfo("Editor code buffer is full! Empty it?");
      
      // Truncate the top of the file to preserve memory (FIFO buffer)
      const overflowAmount = view.state.doc.length - MAX_DOC_LENGTH;
      
      // Find a clean line break near the overflow margin so we don't sever a word
      const lineBoundary = view.state.doc.lineAt(overflowAmount).to;
      
      view.dispatch({
        changes: {
          from: 0,
          to: lineBoundary,
          insert: ""
        }
      });
    }
  },
  
  set value(text) {
    // check to make sure text isn't too large!
    if (text.length > MAX_DOC_LENGTH)
      {
      throw new RangeError(`Error setting editor value, there's too much text!`);
    }
    
    // Calculate the current length of the document    
    const currentLength = view.state.doc.length;
    
    // Replace all text
    view.dispatch({
      changes: {
        from:0,
        to: currentLength,
        insert: text,
      },
    });
  },
  focus() {
    view.focus();
  },
};
}
