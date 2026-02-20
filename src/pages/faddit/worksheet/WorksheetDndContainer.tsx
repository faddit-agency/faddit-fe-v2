import React, { useCallback, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus } from 'lucide-react';

export interface DndItem {
  id: string;
  label: string;
  value: string;
}

const newItem = (): DndItem => ({
  id: crypto.randomUUID(),
  label: '',
  value: '',
});

function SortableDndItem({
  item,
  onLabelChange,
  onValueChange,
}: {
  item: DndItem;
  onLabelChange: (id: string, label: string) => void;
  onValueChange: (id: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center ${isDragging ? 'opacity-50' : ''}`}
    >
      <div
        className='flex shrink-0 cursor-grab items-center px-2 py-1 active:cursor-grabbing'
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} color='#8A8A8A' />
      </div>
      <div className='flex min-w-0 flex-1 items-center gap-x-2'>
        <input
          className='form-input min-w-0 flex-1'
          type='text'
          value={item.label}
          onChange={(e) => onLabelChange(item.id, e.target.value)}
          placeholder='라벨'
        />
        <div className='h-6 w-px shrink-0 bg-gray-200' />
        <input
          className='form-input min-w-0 flex-1'
          type='text'
          value={item.value}
          onChange={(e) => onValueChange(item.id, e.target.value)}
          placeholder='값'
        />
      </div>
    </div>
  );
}

export default function WorksheetDndContainer() {
  const [items, setItems] = useState<DndItem[]>(() => [newItem()]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const handleLabelChange = useCallback((itemId: string, label: string) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, label } : i)));
  }, []);

  const handleValueChange = useCallback((itemId: string, value: string) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, value } : i)));
  }, []);

  const handleAddItem = useCallback(() => {
    setItems((prev) => [...prev, newItem()]);
  }, []);

  return (
    <div id='DND_CONTAINER' className='flex flex-col gap-y-3 py-3 pr-3'>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <SortableDndItem
              key={item.id}
              item={item}
              onLabelChange={handleLabelChange}
              onValueChange={handleValueChange}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        type='button'
        onClick={handleAddItem}
        className='flex cursor-pointer items-center justify-center gap-x-1 rounded border border-dashed border-transparent py-2 text-sm text-gray-500 transition-colors duration-300 hover:border-gray-400 hover:text-gray-600'
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
