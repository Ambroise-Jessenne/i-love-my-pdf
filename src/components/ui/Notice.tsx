import type { ReactNode } from 'react';
import { Icon } from './Icon';
import './ui.css';

interface NoticeProps {
  tone?: 'warning' | 'info';
  children: ReactNode;
}

export function Notice({ tone = 'warning', children }: NoticeProps) {
  return (
    <p className={`notice notice-${tone}`} role="note">
      <Icon name="shield" />
      <span>{children}</span>
    </p>
  );
}
