<script>

    let x = 0;
    /**
     * @type {Map<number, WeakRef<{a: {a: number, b: number, c: number}, b: {a: number, b: number, c: number}, c: {a: number, b: number, c: number}}>>}
     */
    const map = new Map();
    
    const add = () => {
        const bigObj = {
            a: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            b: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
            c: {
                a: Math.random(),
                b: Math.random(),
                c: Math.random(),
            },
        };

        map.set(x++, new WeakRef(bigObj));
    };

    const log = () => console.log(map.get(x)?.deref());
</script>

<button on:click={add}>add</button>
<button on:click={log}>log curr</button>
<button on:click={() => console.log([...map.values()].map(ref => ref.deref()))}>logall</button>
<button on:click={() => map.delete(--x)}>delete</button>