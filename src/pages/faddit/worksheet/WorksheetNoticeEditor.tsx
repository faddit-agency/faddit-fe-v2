import React, { useEffect, useState } from 'react';
import { Extension } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo2,
  Redo2,
} from 'lucide-react';

type ToolButtonProps = {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
};

type WorksheetNoticeEditorProps = {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  initialContent?: string;
};

const DEFAULT_PLACEHOLDER =
  '작업 시 주의사항을 입력하세요 (예: 봉제 순서, 시접 규격, 검수 체크포인트)';

const DEFAULT_NOTICE_CONTENT = `
  <h2>작업 시 주의사항</h2>
  <ul>
    <li>어깨 봉제 전 앞/뒤판 기준점 노치를 먼저 맞춰주세요.</li>
    <li>넥 시보리 연결 시 시접 0.7cm를 유지합니다.</li>
    <li>최종 다림질 전 실밥 정리 및 오염 여부를 확인하세요.</li>
  </ul>
`;

function normalizeEditorHtml(html: string) {
  const trimmed = html.trim();
  if (trimmed === '' || trimmed === '<p></p>') {
    return '';
  }

  return trimmed;
}

const ListTabKeymap = Extension.create({
  name: 'listTabKeymap',
  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive('listItem')) return false;
        return this.editor.chain().focus().sinkListItem('listItem').run();
      },
      'Shift-Tab': () => {
        if (!this.editor.isActive('listItem')) return false;
        return this.editor.chain().focus().liftListItem('listItem').run();
      },
    };
  },
});

function ToolButton({ active = false, disabled = false, onClick, children, title }: ToolButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md border text-slate-500 transition-colors ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-600'
          : 'border-transparent hover:border-slate-200 hover:bg-slate-50 hover:text-slate-700'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

export default function WorksheetNoticeEditor({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  initialContent = DEFAULT_NOTICE_CONTENT,
}: WorksheetNoticeEditorProps) {
  const [, setEditorVersion] = useState(0);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      ListTabKeymap,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value ?? initialContent,
    onUpdate: ({ editor: nextEditor }) => {
      if (!onChange) return;
      onChange(normalizeEditorHtml(nextEditor.getHTML()));
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[180px] border-0 px-3 py-2 text-[13px] leading-6 text-slate-700 outline-none focus:outline-none [&_p]:my-1 [&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-xs [&_h3]:font-semibold [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-500',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const syncToolbar = () => setEditorVersion((v) => v + 1);

    editor.on('selectionUpdate', syncToolbar);
    editor.on('transaction', syncToolbar);
    editor.on('focus', syncToolbar);
    editor.on('blur', syncToolbar);

    return () => {
      editor.off('selectionUpdate', syncToolbar);
      editor.off('transaction', syncToolbar);
      editor.off('focus', syncToolbar);
      editor.off('blur', syncToolbar);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || value === undefined) return;

    const current = normalizeEditorHtml(editor.getHTML());
    const next = normalizeEditorHtml(value);
    if (current === next) return;

    editor.commands.setContent(next || '', { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return null;

  return (
    <div className='flex h-full min-h-0 flex-col bg-white'>
      <div className='flex items-center gap-1 border-b border-slate-200 bg-white px-2 py-1.5'>
        <ToolButton
          title='굵게 (Ctrl/Cmd+B)'
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={14} />
        </ToolButton>
        <ToolButton
          title='기울임 (Ctrl/Cmd+I)'
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={14} />
        </ToolButton>
        <ToolButton
          title='밑줄 (Ctrl/Cmd+U)'
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon size={14} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-slate-200' />

        <ToolButton
          title='제목 2'
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={14} />
        </ToolButton>
        <ToolButton
          title='제목 3'
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 size={14} />
        </ToolButton>
        <ToolButton
          title='목록 (Ctrl/Cmd+Shift+8)'
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={14} />
        </ToolButton>
        <ToolButton
          title='번호 목록 (Ctrl/Cmd+Shift+7)'
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={14} />
        </ToolButton>
        <ToolButton
          title='인용'
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={14} />
        </ToolButton>

        <div className='mx-1 h-5 w-px bg-slate-200' />

        <ToolButton
          title='되돌리기 (Ctrl/Cmd+Z)'
          disabled={!editor.can().chain().focus().undo().run()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={14} />
        </ToolButton>
        <ToolButton
          title='다시하기 (Ctrl/Cmd+Shift+Z)'
          disabled={!editor.can().chain().focus().redo().run()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={14} />
        </ToolButton>
      </div>

      <div className='min-h-0 flex-1 overflow-y-auto bg-white'>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
