import mongoose from 'mongoose';

/**
 * Model: PushSubscription
 * Armazena subscriptions de Web Push API dos participantes
 */
const pushSubscriptionSchema = new mongoose.Schema({
  timeId: {
    type: String,
    required: true,
    index: true
  },
  endpoint: {
    type: String,
    required: true,
    unique: true
  },
  keys: {
    p256dh: {
      type: String,
      required: true
    },
    auth: {
      type: String,
      required: true
    }
  },
  preferences: {
    rodadaConsolidada: { type: Boolean, default: true },
    mitoMico: { type: Boolean, default: true },
    escalacaoPendente: { type: Boolean, default: false },
    acertosFinanceiros: { type: Boolean, default: false }
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  lastUsed: {
    type: Date,
    default: Date.now
  }
});

// Index para limpar subscriptions expiradas automaticamente
pushSubscriptionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index composto para queries frequentes (buscar subscriptions ativas de um participante)
pushSubscriptionSchema.index({ timeId: 1, active: 1 });

// Index para garantir unicidade de endpoint
pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export default mongoose.model('PushSubscription', pushSubscriptionSchema);
