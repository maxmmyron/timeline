<script lang="ts">
  export let el: HTMLElement | undefined = undefined;
  let clazz = "";

  export { clazz as class };
</script>

<article
  class="border border-zinc-200 rounded-xl p-2 {clazz} dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
  bind:this={el}
  on:wheel
  on:drop|preventDefault|stopPropagation
>
  <slot />
</article>
