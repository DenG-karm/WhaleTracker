const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'frontend/src/components/SimulationLobby.jsx');
let txt = fs.readFileSync(file, 'utf8');

const NL = '\r\n'; // file uses Windows CRLF

// Helper to add hook to a function
function addHookAfter(text, funcSignature, hookLine) {
  const idx = text.indexOf(funcSignature);
  if (idx === -1) { console.log('NOT FOUND:', funcSignature.substring(0, 40)); return text; }
  // Find the opening { of the function body
  let braceIdx = text.indexOf('{', idx + funcSignature.length - 1);
  if (braceIdx === -1) return text;
  // Insert after the {
  return text.substring(0, braceIdx + 1) + NL + '  ' + hookLine + text.substring(braceIdx + 1);
}

// Add hooks to components that need them
// PairDropdown
txt = addHookAfter(txt, 'function PairDropdown({ value, onChange }) {', "const { t } = useTranslation();");
// NewSimulationModal
txt = addHookAfter(txt, 'function NewSimulationModal({ onClose, onStart }) {', "const { t } = useTranslation();");
// SessionRow
txt = addHookAfter(txt, 'function SessionRow({ session, onDelete, onResume, index }) {', "const { t } = useTranslation();");
// EmptyState
txt = addHookAfter(txt, 'function EmptyState({ onNew }) {', "const { t } = useTranslation();");
// SimulationLobby main
txt = addHookAfter(txt, 'export default function SimulationLobby({ onStart }) {', "const { t } = useTranslation();");

fs.writeFileSync(file, txt, 'utf8');
console.log('Hooks added');

// Verify
const out = fs.readFileSync(file, 'utf8');
console.log('PairDropdown hook:', out.includes("function PairDropdown({ value, onChange }) {\r\n  const { t } = useTranslation();"));
console.log('Modal hook:', out.includes("function NewSimulationModal({ onClose, onStart }) {\r\n  const { t } = useTranslation();"));
console.log('SessionRow hook:', out.includes("function SessionRow({ session, onDelete, onResume, index }) {\r\n  const { t } = useTranslation();"));
console.log('EmptyState hook:', out.includes("function EmptyState({ onNew }) {\r\n  const { t } = useTranslation();"));
console.log('Main hook:', out.includes("export default function SimulationLobby({ onStart }) {\r\n  const { t } = useTranslation();"));
