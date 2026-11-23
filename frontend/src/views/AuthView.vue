<template>
  <div class="auth-page">
    <div class="container">
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

@media (max-width: 768px) {
  .auth-page {
    padding: 16px 12px 32px;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .auth-page {
    padding: 12px 8px 24px;
  }
  .container {
    max-width: 100%;
  }
}
</style>
