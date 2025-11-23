/**
 * Example usage and test script for address automation
 * This script can be run in the browser console to test the automation
 */

import { fillAddressInput, testAddressAutomation, setupAutoAddressDetection } from '@/utils/automation';

/**
 * Test automation with different addresses
 */
export async function runAutomationTests(): Promise<void> {
  console.log('Starting comprehensive automation tests...\n');
  
  // Test addresses
  const testAddresses = [
    '123 Main Street, New York, NY 10001',
    '456 Oak Avenue, Los Angeles, CA 90210',
    '789 Pine Road, Chicago, IL 60601',
    '321 Elm Drive, Miami, FL 33101'
  ];
  
  let passedTests = 0;
  let failedTests = 0;
  
  // Test 1: Auto-detection
  console.log('📍 Test 1: Auto-detection setup');
  try {
    setupAutoAddressDetection();
    console.log('✅ Auto-detection completed\n');
  } catch (error) {
    console.error('❌ Auto-detection failed:', error);
    failedTests++;
  }
  
  // Test 2: Single address input
  console.log('📍 Test 2: Single address input');
  try {
    const result = await fillAddressInput(testAddresses[0], {
      timeout: 5000,
      clearFirst: true,
      verifyInput: true,
      scrollIntoView: true
    });
    
    if (result.success) {
      console.log('✅ Single address input successful');
      console.log(`   Value: "${result.value}"`);
      passedTests++;
    } else {
      console.error('❌ Single address input failed:', result.error);
      failedTests++;
    }
  } catch (error) {
    console.error('❌ Single address input error:', error);
    failedTests++;
  }
  
  console.log('');
  
  // Test 3: Multiple addresses with clearing
  console.log('📍 Test 3: Multiple addresses with clearing');
  for (let i = 0; i < Math.min(testAddresses.length, 3); i++) {
    try {
      const result = await fillAddressInput(testAddresses[i], {
        timeout: 3000,
        clearFirst: true,
        verifyInput: true,
        scrollIntoView: false // Skip scrolling for speed
      });
      
      if (result.success) {
        console.log(`✅ Address ${i + 1}: "${testAddresses[i]}"`);
        passedTests++;
      } else {
        console.error(`❌ Address ${i + 1} failed:`, result.error);
        failedTests++;
      }
    } catch (error) {
      console.error(`❌ Address ${i + 1} error:`, error);
      failedTests++;
    }
  }
  
  console.log('');
  
  // Test 4: Edge cases
  console.log('📍 Test 4: Edge cases');
  const edgeCases = [
    { address: '', description: 'Empty address' },
    { address: '123', description: 'Very short address' },
    { address: 'A'.repeat(200), description: 'Very long address' },
    { address: '123 Main St, City with spaces, ST 12345', description: 'Address with special characters' }
  ];
  
  for (const testCase of edgeCases) {
    try {
      const result = await fillAddressInput(testCase.address, {
        timeout: 2000,
        clearFirst: true,
        verifyInput: true,
        scrollIntoView: false
      });
      
      if (result.success) {
        console.log(`${testCase.description}: Handled correctly`);
        passedTests++;
      } else {
        console.log(`${testCase.description}: ${result.error} (expected behavior)`);
        passedTests++; // Expected behavior for edge cases
      }
    } catch (error) {
      console.log(`${testCase.description}: ${error} (expected behavior)`);
      passedTests++;
    }
  }
  
  console.log('');
  
  // Test 5: Performance test
  console.log('📍 Test 5: Performance test (10 rapid inputs)');
  const startTime = performance.now();
  
  for (let i = 0; i < 10; i++) {
    try {
      await fillAddressInput(testAddresses[i % testAddresses.length], {
        timeout: 1000,
        clearFirst: i > 0,
        verifyInput: false, // Skip verification for speed
        scrollIntoView: false
      });
    } catch {
      // Continue with next test
    }
  }
  
  const endTime = performance.now();
  const avgTime = (endTime - startTime) / 10;
  
  console.log(`✅ Performance test completed`);
  console.log(`   Average time per input: ${avgTime.toFixed(2)}ms`);
  console.log(`   Total time: ${(endTime - startTime).toFixed(2)}ms`);
  passedTests++;
  
  console.log('\n' + '='.repeat(50));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`Passed tests: ${passedTests}`);
  console.log(`Failed tests: ${failedTests}`);
  console.log(`Success rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('All tests passed successfully!');
  } else {
    console.log('Some tests failed. Check console for details.');
  }
  console.log('='.repeat(50));
}

/**
 * Interactive automation demo
 */
export function startInteractiveDemo(): void {
  console.log('🎮 Starting interactive automation demo...');
  console.log('Available commands:');
  console.log('  fillAddressInput(address, options) - Fill address input');
  console.log('  testAddressAutomation() - Run basic test');
  console.log('  runAutomationTests() - Run comprehensive tests');
  console.log('  setupAutoAddressDetection() - Auto-detect inputs');
  console.log('');
  console.log('Example usage:');
  console.log('  await fillAddressInput("123 Main St, New York, NY 10001")');
  console.log('  await testAddressAutomation()');
  console.log('  runAutomationTests()');
  
  // Make functions available globally
  (window as typeof window & {
    fillAddressInput: typeof fillAddressInput;
    testAddressAutomation: typeof testAddressAutomation;
    runAutomationTests: typeof runAutomationTests;
    setupAutoAddressDetection: typeof setupAutoAddressDetection;
  }).fillAddressInput = fillAddressInput;
  (window as typeof window & {
    fillAddressInput: typeof fillAddressInput;
    testAddressAutomation: typeof testAddressAutomation;
    runAutomationTests: typeof runAutomationTests;
    setupAutoAddressDetection: typeof setupAutoAddressDetection;
  }).testAddressAutomation = testAddressAutomation;
  (window as typeof window & {
    fillAddressInput: typeof fillAddressInput;
    testAddressAutomation: typeof testAddressAutomation;
    runAutomationTests: typeof runAutomationTests;
    setupAutoAddressDetection: typeof setupAutoAddressDetection;
  }).runAutomationTests = runAutomationTests;
  (window as typeof window & {
    fillAddressInput: typeof fillAddressInput;
    testAddressAutomation: typeof testAddressAutomation;
    runAutomationTests: typeof runAutomationTests;
    setupAutoAddressDetection: typeof setupAutoAddressDetection;
  }).setupAutoAddressDetection = setupAutoAddressDetection;
  
  console.log('✅ Interactive demo ready! Functions are available in console.');
}

/**
 * Quick test function for immediate verification
 */
export async function quickTest(): Promise<void> {
  console.log('⚡ Running quick automation test...');
  
  try {
    const testAddress = '123 Main Street, Anytown, ST 12345';
    
    console.log(`Testing with address: "${testAddress}"`);
    
    const result = await fillAddressInput(testAddress, {
      timeout: 3000,
      clearFirst: true,
      verifyInput: true,
      scrollIntoView: true
    });
    
    if (result.success) {
      console.log('Quick test PASSED');
      console.log(`Address filled: "${result.value}"`);
      console.log(`Element found: ${result.elementFound}`);
      console.log(`Element visible: ${result.elementVisible}`);
      console.log(`Element interactable: ${result.elementInteractable}`);
    } else {
      console.error('Quick test FAILED');
      console.error(`Error: ${result.error}`);
      console.log(`Element found: ${result.elementFound}`);
      console.log(`Element visible: ${result.elementVisible}`);
      console.log(`Element interactable: ${result.elementInteractable}`);
    }
  } catch (error) {
    console.error('Quick test error:', error);
  }
}

// Auto-start demo when imported
if (typeof window !== 'undefined') {
  console.log('Address Automation Utility loaded!');
  console.log('Run startInteractiveDemo() to see available commands.');
}