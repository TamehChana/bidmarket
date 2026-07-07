export default function HowItWorksPage() {
  const steps = [
    {
      step: "1",
      title: "Browse as a visitor",
      copy: "Anyone can explore products, view current bids, and watch countdown timers without creating an account.",
    },
    {
      step: "2",
      title: "Register when you want to bid",
      copy: "The moment you want to compete, sign in or create an account from the product page. We return you to the same auction so you can bid immediately.",
    },
    {
      step: "3",
      title: "Highest bidder wins & pays",
      copy: "When the timer ends, the highest valid bid wins. The winner pays via Fapshi using MTN Mobile Money or Orange Money — right from their phone.",
    },
  ];

  return (
    <div>
      <div className="hero-gradient border-b border-border">
        <div className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h1 className="text-3xl font-normal tracking-tight sm:text-4xl">
            How BidMarket works
          </h1>
          <p className="mt-4 text-lg text-muted">
            A simple auction experience built for Cameroon — browse, bid, and pay
            with mobile money.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-6">
          {steps.map((item) => (
            <div
              key={item.step}
              className="flex gap-5 rounded-xl border border-border bg-card p-6 card-elevated"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-sm font-semibold text-accent">
                {item.step}
              </span>
              <div>
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 leading-7 text-muted">{item.copy}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-border bg-brand-muted p-6">
          <h3 className="font-medium">Payment methods</h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Winners pay through Fapshi, supporting MTN Mobile Money and Orange
            Money. All prices are listed in XAF (Central African CFA franc).
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-brand shadow-sm">
              MTN MoMo
            </span>
            <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-brand shadow-sm">
              Orange Money
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
