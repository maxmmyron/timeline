<script lang="ts">
  export let el: HTMLElement | undefined = undefined;
  let clazz = "";

  export { clazz as class };
</script>

<article
  class="border border-zinc-300 rounded-xl p-2 {clazz} dark:border-zinc-800"
  bind:this={el}
  on:wheel
  on:drop|preventDefault|stopPropagation
>
  <slot />
</article>
