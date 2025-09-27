'use client';

import React, { useCallback, useEffect } from 'react';
import { 
  $getRoot, 
  $getSelection, 
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  EditorState,
  $createParagraphNode,
  $createTextNode,
} from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { 
  INSERT_ORDERED_LIST_COMMAND, 
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND
} from '@lexical/list';


// Toolbar Component
function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = React.useState(false);
  const [isItalic, setIsItalic] = React.useState(false);
  const [isUnderline, setIsUnderline] = React.useState(false);

  const $updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, _newEditor) => {
        $updateToolbar();
        return false;
      },
      1,
    );
  }, [editor, $updateToolbar]);

  return (
    <div className="flex items-center space-x-2 p-2 border-b border-gray-200 bg-gray-50">
      {/* Bold */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
        }}
        className={`p-2 rounded text-sm font-medium transition-colors ${
          isBold 
            ? 'bg-blue-500 text-white' 
            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
        }`}
        title="Bold (Ctrl+B)"
      >
        <strong>B</strong>
      </button>

      {/* Italic */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
        }}
        className={`p-2 rounded text-sm font-medium transition-colors ${
          isItalic 
            ? 'bg-blue-500 text-white' 
            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
        }`}
        title="Italic (Ctrl+I)"
      >
        <em>I</em>
      </button>

      {/* Underline */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
        }}
        className={`p-2 rounded text-sm font-medium transition-colors ${
          isUnderline 
            ? 'bg-blue-500 text-white' 
            : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-300'
        }`}
        title="Underline (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <div className="w-px h-6 bg-gray-300 mx-2"></div>

      {/* Bullet List */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
        }}
        className="p-2 rounded text-sm font-medium transition-colors bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
        title="Bullet List"
      >
        •
      </button>

      {/* Numbered List */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
        }}
        className="p-2 rounded text-sm font-medium transition-colors bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
        title="Numbered List"
      >
        1.
      </button>

      {/* Remove List */}
      <button
        type="button"
        onClick={() => {
          editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        }}
        className="p-2 rounded text-sm font-medium transition-colors bg-white hover:bg-gray-100 text-gray-700 border border-gray-300"
        title="Remove List"
      >
        ✕
      </button>
    </div>
  );
}

// Plugin to set initial content
function InitialContentPlugin({ value }: { value: string }) {
  const [editor] = useLexicalComposerContext();
  
  useEffect(() => {
    if (value) {
      editor.update(() => {
        const root = $getRoot();
        root.clear();
        
        // Split by lines and create paragraphs
        const lines = value.split('\n');
        lines.forEach((line) => {
          const paragraph = $createParagraphNode();
          
          // Handle HTML formatting (bold, italic, etc.)
          if (line.includes('<strong>') || line.includes('<b>')) {
            // Parse simple HTML formatting
            const parts = line.split(/(<\/?(?:strong|b)>)/);
            let isBold = false;
            
            parts.forEach(part => {
              if (part === '<strong>' || part === '<b>') {
                isBold = true;
              } else if (part === '</strong>' || part === '</b>') {
                isBold = false;
              } else if (part && part.trim()) {
                const textNode = $createTextNode(part);
                if (isBold) {
                  textNode.toggleFormat('bold');
                }
                paragraph.append(textNode);
              }
            });
          } else {
            // Plain text
            const textNode = $createTextNode(line || '');
            paragraph.append(textNode);
          }
          
          root.append(paragraph);
        });
      });
    }
  }, [editor, value]);

  return null;
}

// Main RichTextEditor component
interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  minimal?: boolean;
  error?: boolean;
}

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Masukkan teks...',
  className = '',
  rows = 4,
  disabled = false,
  minimal = false,
  error = false
}: RichTextEditorProps) {
  
  // Initial editor configuration
  const initialConfig = {
    namespace: 'RichTextEditor',
    theme: {
      root: 'p-0 border-0 focus:outline-none',
      text: {
        bold: 'font-bold',
        italic: 'italic',
        underline: 'underline',
      },
      list: {
        ul: 'list-disc list-inside ml-4',
        ol: 'list-decimal list-inside ml-4',
        listitem: 'py-1',
      },
    },
    onError(error: Error) {
      console.error('Lexical editor error:', error);
    },
    nodes: [ListNode, ListItemNode],
    editable: !disabled,
  };

  const handleEditorChange = (editorState: EditorState) => {
    if (onChange) {
      editorState.read(() => {
        const root = $getRoot();
        // Untuk sekarang gunakan text content dulu, nanti bisa diperluas untuk HTML
        const textContent = root.getTextContent();
        
        // Sederhana untuk bold formatting - dapat ditingkatkan nanti
        const htmlContent = textContent;
        
        // Basic HTML conversion untuk bold text (contoh sederhana)
        // Ini bisa diperluas untuk formatting lain
        onChange(htmlContent);
      });
    }
  };

  return (
    <div className={`border ${error ? 'border-red-300' : 'border-gray-300'} rounded-lg overflow-hidden ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        {/* Toolbar - hanya tampil jika tidak minimal dan tidak disabled */}
        {!disabled && !minimal && <ToolbarPlugin />}
        
        {/* Editor */}
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={`
                  p-3 resize-none outline-none 
                  ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                  min-h-[${rows * 1.5}rem]
                `}
                style={{ minHeight: `${rows * 1.5}rem` }}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-gray-400 pointer-events-none select-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          
          {/* Plugins */}
          <HistoryPlugin />
          <ListPlugin />
          <OnChangePlugin onChange={handleEditorChange} />
          
          {/* Set initial content plugin */}
          <InitialContentPlugin value={value} />
        </div>
      </LexicalComposer>
    </div>
  );
}
