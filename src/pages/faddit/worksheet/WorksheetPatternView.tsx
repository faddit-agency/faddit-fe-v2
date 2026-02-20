import React, { useRef, useState } from 'react';
import { Eye, File, FileEdit, Trash2, Upload } from 'lucide-react';

interface PatternFile {
  id: string;
  name: string;
  ext: string;
  url: string;
  size: number;
}

const ACCEPTED_TYPES = '.svg,.dxf,.pdf,image/*';

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getExt = (name: string): string => name.split('.').pop()?.toLowerCase() ?? '';

const isPreviewable = (ext: string): boolean =>
  ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);

const makePatternFile = (file: File): PatternFile => ({
  id: crypto.randomUUID(),
  name: file.name,
  ext: getExt(file.name),
  url: URL.createObjectURL(file),
  size: file.size,
});

export default function WorksheetPatternView() {
  const [files, setFiles] = useState<PatternFile[]>([]);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const addFiles = (fileList: FileList) => {
    setFiles((prev) => [...prev, ...Array.from(fileList).map(makePatternFile)]);
  };

  const handleUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleReplaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !replacingId) return;
    const next = makePatternFile(e.target.files[0]);
    setFiles((prev) => prev.map((f) => (f.id === replacingId ? { ...next, id: f.id } : f)));
    setReplacingId(null);
    e.target.value = '';
  };

  const handleDelete = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((f) => f.id !== id);
    });
  };

  const openReplace = (id: string) => {
    setReplacingId(id);
    replaceInputRef.current?.click();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-4 py-2'>
        <button
          type='button'
          onClick={() => uploadInputRef.current?.click()}
          className='flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700'
        >
          <Upload size={14} />
          파일 업로드
        </button>
        <span className='text-xs text-gray-400'>SVG · DXF · PDF · 이미지</span>
      </div>

      <input
        ref={uploadInputRef}
        type='file'
        multiple
        accept={ACCEPTED_TYPES}
        className='hidden'
        onChange={handleUploadChange}
      />
      <input
        ref={replaceInputRef}
        type='file'
        accept={ACCEPTED_TYPES}
        className='hidden'
        onChange={handleReplaceChange}
      />

      {files.length === 0 ? (
        <div
          className='flex flex-1 cursor-pointer items-center justify-center'
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => uploadInputRef.current?.click()}
        >
          <div className='flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-gray-200 px-16 py-12 transition-colors hover:border-gray-300 hover:bg-gray-50'>
            <Upload size={36} className='text-gray-300' />
            <div className='text-center'>
              <p className='text-sm font-medium text-gray-600'>
                파일을 드래그하거나 클릭하여 업로드
              </p>
              <p className='mt-1 text-xs text-gray-400'>SVG · DXF · PDF · JPG · PNG 지원</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className='flex-1 overflow-y-auto p-4'
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
            {files.map((file) => (
              <div
                key={file.id}
                className='group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md'
              >
                <div className='flex h-28 items-center justify-center bg-gray-50'>
                  {isPreviewable(file.ext) ? (
                    <img src={file.url} alt={file.name} className='h-full w-full object-contain' />
                  ) : (
                    <div className='flex flex-col items-center gap-1'>
                      <File size={32} className='text-gray-300' />
                      <span className='text-xs font-bold text-gray-400 uppercase'>{file.ext}</span>
                    </div>
                  )}
                </div>

                <div className='px-2 py-1.5'>
                  <p className='truncate text-xs font-medium text-gray-700' title={file.name}>
                    {file.name}
                  </p>
                  <p className='text-[10px] text-gray-400'>{formatFileSize(file.size)}</p>
                </div>

                <div className='absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100'>
                  <button
                    type='button'
                    title='미리보기'
                    onClick={() => window.open(file.url, '_blank')}
                    className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 transition-colors hover:bg-gray-100'
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type='button'
                    title='수정 (파일 교체)'
                    onClick={() => openReplace(file.id)}
                    className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-700 transition-colors hover:bg-gray-100'
                  >
                    <FileEdit size={14} />
                  </button>
                  <button
                    type='button'
                    title='삭제'
                    onClick={() => handleDelete(file.id)}
                    className='flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 transition-colors hover:bg-red-50'
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
