<script lang="ts">
  export let el: HTMLElement | undefined = undefined;
  let clazz = "";

  export { clazz as class };
</script>

<article
  class="border border-gray-300 rounded-lg p-2 {clazz}"
  bind:this={el}
  on:wheel
>
  <slot />
</article>
