// Debug script to check AI insights functionality
// Run this in browser console to test the insights modal

// 3. Manually trigger insights generation
async function testInsightsGeneration() {
  try {
    
    // Get current date data
    const selectedDate = new Date().toISOString().split('T')[0];
    
    // Check if we have daily metrics
    const dailyMetrics = window.__HOME_COMPONENT__?.dailyMetrics;
    
    if (dailyMetrics && (dailyMetrics.calories > 0 || dailyMetrics.exercise > 0)) {
      console.log('✓ Has data to generate insights');
      
      // Try to open insights modal
      window.__HOME_COMPONENT__?.openModal('insights');
      console.log('✓ Opened insights modal');
    } else {
      console.log('✗ No health data available for insights generation');
    }
  } catch (error) {
    console.error('Error testing insights:', error);
  }
}

// Export for manual testing
window.testInsightsGeneration = testInsightsGeneration;
console.log('Debug functions loaded. Run testInsightsGeneration() to test.');
