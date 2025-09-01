/*
  ================================================================
  Regex Engine Core Logic
  Translated, Refactored, and Bugfixed
  ================================================================
*/

// --- State and NFA Data Structures ---
class State {
  constructor(isEndState) {
    this.isEndState = isEndState;
    this.transitions = new Map();
    this.epsilonTransitions = [];
  }
}

class NFA {
  constructor(startState, endState) {
    this.startState = startState;
    this.endState = endState;
  }
}

// --- Helper Functions ---

/**
 * Adds concatenation operators (.) to the regex string where needed.
 * This is a crucial preprocessing step for the Shunting-Yard algorithm.
 * @param {string} regex - The input regular expression.
 * @returns {string} The regex with explicit concatenation operators.
 */
function addConcatOperators(regex) {
  let output = "";
  for (let i = 0; i < regex.length; i++) {
    const token = regex[i];
    output += token;
    if (token === "(" || token === "|") continue;
    if (i < regex.length - 1) {
      const nextToken = regex[i + 1];
      if (
        nextToken === "*" ||
        nextToken === "+" ||
        nextToken === "|" ||
        nextToken === ")"
      )
        continue;
      output += ".";
    }
  }
  return output;
}

const operatorPrecedence = { "|": 0, ".": 1, "*": 2, "+": 2 };

/**
 * Converts an infix regex string to postfix notation using the Shunting-Yard algorithm.
 * @param {string} regex - The regex string with concat operators.
 * @returns {string} The postfix representation of the regex.
 */
function convertToPostfix(regex) {
  let output = "";
  const operatorStack = [];
  const peek = (stack) => (stack.length ? stack[stack.length - 1] : null);

  for (const token of regex) {
    if (token === "." || token === "|" || token === "*" || token === "+") {
      while (
        operatorStack.length &&
        peek(operatorStack) !== "(" &&
        operatorPrecedence[peek(operatorStack)] >= operatorPrecedence[token]
      ) {
        output += operatorStack.pop();
      }
      operatorStack.push(token);
    } else if (token === "(" || token === ")") {
      if (token === "(") {
        operatorStack.push(token);
      } else {
        while (peek(operatorStack) !== "(") {
          output += operatorStack.pop();
        }
        operatorStack.pop();
      }
    } else {
      output += token;
    }
  }

  while (operatorStack.length) {
    output += operatorStack.pop();
  }
  return output;
}

// --- Thompson's Construction: Postfix to NFA ---

function createBasicNFA(symbol) {
  const startState = new State(false);
  const endState = new State(true);
  if (symbol === "ε") {
    startState.epsilonTransitions.push(endState);
  } else {
    startState.transitions.set(symbol, endState);
  }
  return new NFA(startState, endState);
}

function concatNFA(first, second) {
  first.endState.isEndState = false;
  first.endState.epsilonTransitions.push(second.startState);
  return new NFA(first.startState, second.endState);
}

function unionNFA(first, second) {
  const startState = new State(false);
  startState.epsilonTransitions.push(first.startState, second.startState);
  const endState = new State(true);
  first.endState.isEndState = false;
  second.endState.isEndState = false;
  first.endState.epsilonTransitions.push(endState);
  second.endState.epsilonTransitions.push(endState);
  return new NFA(startState, endState);
}

function kleeneStarNFA(nfa) {
  const startState = new State(false);
  const endState = new State(true);
  startState.epsilonTransitions.push(endState, nfa.startState);
  nfa.endState.isEndState = false;
  nfa.endState.epsilonTransitions.push(endState, nfa.startState);
  return new NFA(startState, endState);
}

function kleenePlusNFA(nfa) {
  const startState = new State(false);
  const endState = new State(true);
  startState.epsilonTransitions.push(nfa.startState);
  nfa.endState.isEndState = false;
  nfa.endState.epsilonTransitions.push(endState, nfa.startState);
  return new NFA(startState, endState);
}

/**
 * Converts a postfix regex string into a Non-deterministic Finite Automaton (NFA).
 * @param {string} postfix - The postfix regex string.
 * @returns {NFA} The resulting NFA.
 */
function postfixToNFA(postfix) {
  if (postfix === "") return createBasicNFA("ε");

  const stack = [];

  for (const token of postfix) {
    switch (token) {
      case "*":
        stack.push(kleeneStarNFA(stack.pop()));
        break;
      case "+":
        stack.push(kleenePlusNFA(stack.pop()));
        break;
      case "|": {
        const right = stack.pop();
        const left = stack.pop();
        stack.push(unionNFA(left, right));
        break;
      }
      case ".": {
        const right = stack.pop();
        const left = stack.pop();
        stack.push(concatNFA(left, right));
        break;
      }
      default:
        stack.push(createBasicNFA(token));
    }
  }
  return stack.pop();
}

// --- Subset Construction: NFA to DFA ---

/**
 * Converts an NFA into a Deterministic Finite Automaton (DFA).
 * @param {NFA} nfa - The input NFA.
 * @returns {State} The start state of the resulting DFA.
 */
function nfaToDFA(nfa) {
  const epsilonClosure = (states) => {
    const stack = [...states];
    const closure = new Set(states);
    while (stack.length > 0) {
      const state = stack.pop();
      for (const s of state.epsilonTransitions) {
        if (!closure.has(s)) {
          closure.add(s);
          stack.push(s);
        }
      }
    }
    return closure;
  };

  const move = (states, symbol) => {
    const result = new Set();
    for (const state of states) {
      const next = state.transitions.get(symbol);
      if (next) result.add(next);
    }
    return result;
  };

  // Use a string key for map lookups, based on a unique ID for each NFA state
  const stateIdMap = new Map();
  let nextId = 0;
  const getStateKey = (states) => {
    const ids = [];
    for (const s of states) {
      if (!stateIdMap.has(s)) {
        stateIdMap.set(s, nextId++);
      }
      ids.push(stateIdMap.get(s));
    }
    return ids.sort((a, b) => a - b).join(",");
  };

  const startClosure = epsilonClosure(new Set([nfa.startState]));
  const dfaStates = new Map();
  const queue = [startClosure];

  const dfaStartState = new State(Array.from(startClosure).some((s) => s.isEndState));
  dfaStates.set(getStateKey(startClosure), dfaStartState);

  while (queue.length > 0) {
    const currentNfaStates = queue.shift();
    const currentDfaState = dfaStates.get(getStateKey(currentNfaStates));

    const symbols = new Set();
    for (const state of currentNfaStates) {
      state.transitions.forEach((_, symbol) => symbols.add(symbol));
    }

    for (const symbol of symbols) {
      const nextNfaStates = epsilonClosure(move(currentNfaStates, symbol));
      if (nextNfaStates.size > 0) {
        const key = getStateKey(nextNfaStates);
        let nextDfaState = dfaStates.get(key);
        if (!nextDfaState) {
          nextDfaState = new State(Array.from(nextNfaStates).some((s) => s.isEndState));
          dfaStates.set(key, nextDfaState);
          queue.push(nextNfaStates);
        }
        currentDfaState.transitions.set(symbol, nextDfaState);
      }
    }
  }
  return dfaStartState;
}

// --- NEW AND IMPROVED SEARCH LOGIC ---

/**
 * Searches a text for all matches of a compiled DFA.
 * This is the corrected logic that finds all substrings, not just whole words.
 * @param {State} dfa - The start state of the DFA.
 * @param {string} text - The text to search in.
 * @returns {Array<{match: string, index: number}>} An array of match objects.
 */
function searchDFA(dfa, text) {
  if (!dfa) return [];

  const matches = [];
  for (let i = 0; i < text.length; i++) {
    let currentState = dfa;
    for (let j = i; j < text.length; j++) {
      const char = text[j];
      if (currentState.transitions.has(char)) {
        currentState = currentState.transitions.get(char);
        if (currentState.isEndState) {
          const match = text.substring(i, j + 1);
          matches.push({ match, index: i });
        }
      } else {
        break; // No transition, this path is dead
      }
    }
  }
  return filterSubmatches(matches);
}

/**
 * Filters out shorter matches that are contained within longer matches.
 * For example, if "a" and "ab" are both matches, it only keeps "ab".
 * @param {Array<{match: string, index: number}>} matches - The raw list of matches.
 * @returns {Array<{match: string, index: number}>} The filtered list.
 */
function filterSubmatches(matches) {
    if (!matches || matches.length === 0) return [];
    
    // Sort matches primarily by index, then by length descending
    matches.sort((a, b) => {
        if (a.index !== b.index) {
            return a.index - b.index;
        }
        return b.match.length - a.match.length;
    });

    const filtered = [];
    let lastMatchEnd = -1;

    for (const match of matches) {
        const matchEnd = match.index + match.match.length;
        if (match.index >= lastMatchEnd) {
            filtered.push(match);
            lastMatchEnd = matchEnd;
        }
    }
    return filtered;
}


// --- Main function to be called from HTML ---

/**
 * Compiles a regex and uses it to find and highlight matches in a text.
 * @param {string} pattern - The regex pattern.
 * @param {string} text - The text to search.
 */
function createMatcher(pattern, text) {
  // Clear previous results
  const resultDiv = document.getElementById("sonuc");
  resultDiv.innerHTML = "";

  if (!pattern || !text) {
    resultDiv.textContent = text;
    return;
  }
  
  // 1. Compile the regex
  const processedPattern = addConcatOperators(pattern);
  const postfixPattern = convertToPostfix(processedPattern);
  const nfa = postfixToNFA(postfixPattern);
  const dfa = nfaToDFA(nfa);
  
  // 2. Search for matches
  const matches = searchDFA(dfa, text);
  
  // 3. Highlight the matches
  let lastIndex = 0;
  let highlightedHtml = "";

  matches.forEach(({ match, index }) => {
    // Add the text before the match
    highlightedHtml += text.substring(lastIndex, index);
    // Add the highlighted match
    highlightedHtml += `<mark>${match}</mark>`;
    lastIndex = index + match.length;
  });

  // Add any remaining text after the last match
  highlightedHtml += text.substring(lastIndex);

  resultDiv.innerHTML = highlightedHtml;
}
