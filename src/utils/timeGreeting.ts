export const getTimeBasedGreeting = (): string => {
  // Get current time in Oslo timezone (Europe/Oslo)
  const osloTime = new Date().toLocaleString('en-US', {
    timeZone: 'Europe/Oslo',
    hour12: false,
    hour: '2-digit',
  });

  const hour = parseInt(osloTime);

  if (hour >= 5 && hour < 12) {
    return 'God morgen';
  } else if (hour >= 12 && hour < 18) {
    return 'God dag';
  } else {
    return 'God kveld';
  }
};
