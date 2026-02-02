/**
 * Consolidação Page - Consolidação manual de rodadas
 */

import API from '../api.js';
import { showEmptyState } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');

  showEmptyState(container, {
    icon: '⚙️',
    title: 'Consolidação de Rodadas',
    text: 'Esta funcionalidade será implementada na FASE 4'
  });
}
