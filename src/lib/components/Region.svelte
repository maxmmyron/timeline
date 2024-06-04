<script lang="ts">
  export let el: HTMLElement | undefined = undefined;
  let clazz = "";

  export { clazz as class };
</script>

<article
  class="rounded-sm p-2 {clazz} bg-zinc-100 dark:bg-zinc-925"
  bind:this={el}
  on:wheel
  on:drop|preventDefault|stopPropagation
>
  <slot />
</article>
