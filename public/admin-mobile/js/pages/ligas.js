/**
 * Ligas Page - Gestão de ligas
 */

import API from '../api.js';
import { showEmptyState } from '../app.js';

export async function render(params = {}) {
  const container = document.getElementById('page-content');

  showEmptyState(container, {
    icon: '🏆',
    title: 'Gestão de Ligas',
    text: 'Esta funcionalidade será implementada na FASE 3'
  });
}
