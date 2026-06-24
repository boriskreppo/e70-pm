import React from 'react';
import { ChevronRight as LucideChevronRight, ChevronLeft as LucideChevronLeft, ChevronDown as LucideChevronDown, Search as LucideSearch, Trash2 as LucideTrash, Check as LucideCheck, Bell as LucideBell } from 'lucide-react';

export function ChevronRight({ size = 16 }) {
  return <LucideChevronRight size={size} strokeWidth={1.5} />;
}

export function ChevronLeft({ size = 16 }) {
  return <LucideChevronLeft size={size} strokeWidth={1.5} />;
}

export function ChevronDown({ size = 16 }) {
  return <LucideChevronDown size={size} strokeWidth={1.5} />;
}

export function SearchIcon({ size = 16 }) {
  return <LucideSearch size={size} strokeWidth={1.5} />;
}

export function TrashIcon({ size = 16 }) {
  return <LucideTrash size={size} strokeWidth={1.5} />;
}

export function CheckIcon({ size = 16 }) {
  return <LucideCheck size={size} strokeWidth={2} />;
}

export function BellIcon({ size = 20 }) {
  return <LucideBell size={size} strokeWidth={1.5} />;
}
