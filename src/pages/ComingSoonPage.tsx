const ComingSoonPage = () => {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-base font-medium text-foreground mb-6">Openspot</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl mb-4">
          Kommer snart
        </h1>
        <p className="text-base text-foreground-muted mb-8">
          Påmelding og betaling for yogastudioer. Vi åpner snart.
        </p>
        <a
          href="mailto:hei@openspot.no"
          className="text-sm font-medium text-foreground-muted hover:text-foreground transition-colors"
        >
          hei@openspot.no
        </a>
      </div>
    </div>
  );
};

export default ComingSoonPage;
