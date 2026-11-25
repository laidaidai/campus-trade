<template>
  <div class="auth-page">
    <div class="container">
      <header class="auth-brand">
        <div class="brand-mark" aria-hidden="true">校</div>
        <div class="brand-copy">
          <strong>校园交易</strong>
          <span>校园闲置，就在身边</span>
        </div>
      </header>
      <AuthCard />
    </div>
  </div>
</template>

<script setup>
import AuthCard from '@/components/AuthCard.vue'
</script>

<style scoped>
.auth-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg);
  padding: 32px;
}

.container {
  width: 100%;
  max-width: 960px;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  margin: 0 0 14px;
  padding: 0;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--primary);
  border: 2px solid var(--edge);
  border-radius: 11px;
  box-shadow: 3px 4px 0 var(--shadow);
  color: var(--on-primary);
  font-size: 19px;
  font-weight: 900;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-copy strong {
  color: var(--ink);
  font-size: 16px;
  font-weight: 900;
  letter-spacing: 0.02em;
}

.brand-copy span {
  color: var(--text-3);
  font-size: 12px;
}

@media (max-width: 768px) {
  .auth-page {
    padding: 22px 12px 32px;
    align-items: flex-start;
  }
  .auth-brand { width: 100%; margin-bottom: 12px; }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 18px 8px 24px;
  }
  .auth-brand { padding: 0 8px; }
  .container {
    max-width: 100%;
  }
}
</style>
