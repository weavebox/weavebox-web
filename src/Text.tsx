function Text() {
  return (
    <>
      <section className="text-center px-8">
        <h2 className="text-gray-900 text-2xl tracking-tight font-extrabold sm:text-4xl">
          “Best practices” don’t actually work.
        </h2>

        <figure>
          <blockquote>
            <p className="mt-6 max-w-3xl mx-auto text-base">
              I’ve written{" "}
              <a
                href="https://adamwathan.me/css-utility-classes-and-separation-of-concerns/"
                className="text-sky-500 font-semibold"
              >
                a few thousand words
              </a>{" "}
              on why traditional “semantic class names” are the reason CSS is
              hard to maintain, but the truth is you’re never going to believe
              me until you actually try it. If you can suppress the urge to
              retch long enough to give it a chance, I really think you’ll
              wonder how you ever worked with CSS any other way.
            </p>
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center space-x-4 text-left">
            <img
              src="https://tailwindcss.com/_next/static/media/adam.87b7f7dc7e16987ddbf37dd55b1ff705.jpg"
              alt=""
              className="w-14 h-14 rounded-full"
              loading="lazy"
            />
            <div>
              <div className="text-gray-900 font-semibold">Adam Wathan</div>
              <div className="mt-0.5 text-sm leading-6">
                Creator of Tailwind CSS
              </div>
            </div>
          </figcaption>
        </figure>
      </section>

      <div className="container mx-auto pt-4 px-4">
        <section className="my-40">1</section>
        <section className="my-40">2</section>
        <section className="my-40">3</section>
        <section className="my-40">4</section>
        <section className="my-40">5</section>

        <h1 className="text-base font-bold underline">Hello CodeSandbox</h1>
        <h2 className="text-base">Start editing to see some magic happen!</h2>

        <div className="mt-4"></div>

        <p className="text-2xl mt-8">
          text-2xl: 1.5rem The <code>theme</code> section of your{" "}
          <code>tailwind.config.js</code> file is where you define your
          project’s color palette, type scale, fonts, breakpoints, border radius
          values, and more.
        </p>

        <p className="text-xl mt-8">
          text-xl: 1.25rem The <code>theme</code> section of your{" "}
          <code>tailwind.config.js</code> file is where you define your
          project’s color palette, type scale, fonts, breakpoints, border radius
          values, and more.
        </p>

        <p className="text-base mt-8">
          text-base: 1rem The <code>theme</code> section of your{" "}
          <code>tailwind.config.js</code> file is where you define your
          project’s color palette, type scale, fonts, breakpoints, border radius
          values, and more.
        </p>

        <p className="text-sm mt-8">
          text-sm: 0.875rem The <code>theme</code> section of your{" "}
          <code>tailwind.config.js</code> file is where you define your
          project’s color palette, type scale, fonts, breakpoints, border radius
          values, and more.
        </p>

        <p className="text-xs mt-8">
          text-xs: 0.75rem The <code>theme</code> section of your{" "}
          <code>tailwind.config.js</code> file is where you define your
          project’s color palette, type scale, fonts, breakpoints, border radius
          values, and more.
        </p>
      </div>
    </>
  );
}

export default Text;
