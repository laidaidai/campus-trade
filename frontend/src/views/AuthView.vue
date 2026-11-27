<template>
  <div class="auth-page">
    <main class="container">
      <h1 class="sr-only">登录或注册校园交易</h1>
      <header class="auth-brand">
        <div class="brand-mark" aria-hidden="true">校</div>
        <div class="brand-copy">
          <strong>校园交易</strong>
          <span>同校面交 · 无服务费</span>
        </div>
      </header>
      <AuthCard />
    </main>
  </div>
</template>

<script setup>
import AuthCard from '@/components/AuthCard.vue'
</script>

<style scoped>
.auth-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg);
  padding: 34px;
  overflow: hidden;
}

.container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 960px;
}

.auth-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  margin: 0 0 16px;
  padding: 0 4px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  background: var(--primary);
  border-radius: 3px;
  color: var(--on-primary);
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-copy strong {
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.brand-copy span {
  color: var(--text-3);
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 767px) {
  .auth-page {
    padding: 24px 12px 34px;
    align-items: flex-start;
  }
  .auth-brand { width: 100%; margin-bottom: 12px; padding: 0 8px; }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 18px 10px 26px;
  }
  .container {
    max-width: 100%;
  }
  .auth-brand { padding: 0 6px; }
  .brand-mark { width: 38px; height: 38px; font-size: 18px; }
}
</style>
