/**
 * Automation utility for filling address input fields
 * Provides cross-browser compatible input automation with proper error handling
 */

export interface AutomationOptions {
  timeout?: number;
  clearFirst?: boolean;
  verifyInput?: boolean;
  scrollIntoView?: boolean;
}

export interface AutomationResult {
  success: boolean;
  value: string;
  error?: string;
  elementFound: boolean;
  elementVisible: boolean;
  elementInteractable: boolean;
}

/**
 * Waits for an element to be present in the DOM
 * @deprecated Currently unused but kept for future use
 */
/*
async function waitForElement(
  selector: string, 
  timeout: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      if (Date.now() - startTime >= timeout) {
        resolve(null);
        return;
      }
      
      requestAnimationFrame(checkElement);
    };
    
    checkElement();
  });
}
*/

/**
 * Checks if an element is visible and interactable
 */
function isElementInteractable(element: Element): {
  visible: boolean;
  interactable: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Check if element exists
  if (!element) {
    reasons.push('Element does not exist');
    return { visible: false, interactable: false, reasons };
  }
  
  // Check if element is in DOM
  if (!document.body.contains(element)) {
    reasons.push('Element not in DOM');
    return { visible: false, interactable: false, reasons };
  }
  
  // Get computed styles
  const computedStyle = window.getComputedStyle(element);
  
  // Check visibility
  const isVisible = computedStyle.display !== 'none' &&
                   computedStyle.visibility !== 'hidden' &&
                   computedStyle.opacity !== '0';
  
  if (!isVisible) {
    if (computedStyle.display === 'none') reasons.push('display: none');
    if (computedStyle.visibility === 'hidden') reasons.push('visibility: hidden');
    if (computedStyle.opacity === '0') reasons.push('opacity: 0');
  }
  
  // Check dimensions
  const rect = element.getBoundingClientRect();
  const hasDimensions = rect.width > 0 && rect.height > 0;
  
  if (!hasDimensions) {
    reasons.push('Zero dimensions');
  }
  
  // Check if interactable (not disabled, not readonly)
  const htmlElement = element as HTMLElement;
  const isDisabled = htmlElement.hasAttribute?.('disabled') && htmlElement.getAttribute('disabled') !== 'false';
  const isReadOnly = htmlElement.hasAttribute?.('readonly') && htmlElement.getAttribute('readonly') !== 'false';
  
  const interactable = !isDisabled && !isReadOnly && hasDimensions && isVisible;
  
  if (isDisabled) reasons.push('Element is disabled');
  if (isReadOnly) reasons.push('Element is readonly');
  
  return {
    visible: isVisible && hasDimensions,
    interactable,
    reasons
  };
}

/**
 * Clears input field value using multiple methods for cross-browser compatibility
 */
function clearInputValue(element: HTMLInputElement | HTMLTextAreaElement): void {
  // Method 1: Direct value clearing
  element.value = '';
  
  // Method 2: Event-driven clearing
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  
  // Method 3: Trigger React onChange if present
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, '');
    element.dispatchEvent(inputEvent);
  }
}

/**
 * Sets input field value using multiple methods for cross-browser compatibility
 */
function setInputValue(
  element: HTMLInputElement | HTMLTextAreaElement, 
  value: string
): void {
  // Method 1: Direct value setting
  element.value = value;
  
  // Method 2: Event-driven setting
  const inputEvent = new Event('input', { bubbles: true, cancelable: true });
  const changeEvent = new Event('change', { bubbles: true, cancelable: true });
  
  element.dispatchEvent(inputEvent);
  element.dispatchEvent(changeEvent);
  
  // Method 3: Trigger React onChange if present
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;
  
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(element, value);
    element.dispatchEvent(inputEvent);
  }
}

/**
 * Verifies that the input value was set correctly
 */
function verifyInputValue(
  element: HTMLInputElement | HTMLTextAreaElement, 
  expectedValue: string
): boolean {
  return element.value === expectedValue;
}

/**
 * Scrolls element into view if needed
 */
function scrollElementIntoView(element: Element): void {
  const rect = element.getBoundingClientRect();
  const isInViewport = (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
  
  if (!isInViewport) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'center',
      inline: 'nearest'
    });
  }
}

/**
 * Main automation function to fill address input field
 */
export async function fillAddressInput(
  address: string,
  options: AutomationOptions = {}
): Promise<AutomationResult> {
  const {
    // timeout = 5000, // Removed to fix linting issue
    clearFirst = true,
    verifyInput = true,
    scrollIntoView = true
  } = options;
  
  const result: AutomationResult = {
    success: false,
    value: '',
    elementFound: false,
    elementVisible: false,
    elementInteractable: false
  };
  
  try {
    console.log(`🤖 Starting address input automation for: "${address}"`);
    
    // Step 1: Find the address input element
    console.log('🔍 Searching for address input element...');
    
    // Try multiple selectors for cross-browser compatibility
    const selectors = [
      'input[placeholder*="address" i]',
      'input[placeholder*="123 Main" i]',
      'input[type="text"][placeholder*="Street" i]',
      '.address-input input',
      'input[name*="address" i]',
      'input[id*="address" i]',
      // Specific to our UnifiedCommandBar
      '.min-w-0 input[type="text"]',
      'input[placeholder*="min. 10 characters" i]'
    ];
    
    let element: HTMLInputElement | null = null;
    // let foundSelector = ''; // Removed to fix linting issue
    
    for (const selector of selectors) {
      element = document.querySelector(selector) as HTMLInputElement;
      if (element) {
        // foundSelector = selector; // Removed to fix linting issue
        console.log(`✅ Element found using selector: ${selector}`);
        break;
      }
    }
    
    if (!element) {
      console.error('❌ Address input element not found');
      result.error = 'Address input element not found';
      return result;
    }
    
    result.elementFound = true;
    
    // Step 2: Check element visibility and interactability
    console.log('Checking element visibility and interactability...');
    const interactability = isElementInteractable(element);
    
    result.elementVisible = interactability.visible;
    result.elementInteractable = interactability.interactable;
    
    if (!interactability.interactable) {
      console.error('❌ Element not interactable:', interactability.reasons.join(', '));
      result.error = `Element not interactable: ${interactability.reasons.join(', ')}`;
      return result;
    }
    
    console.log('✅ Element is visible and interactable');
    
    // Step 3: Scroll into view if needed
    if (scrollIntoView) {
      console.log('📜 Scrolling element into view...');
      scrollElementIntoView(element);
      // Wait a bit for scroll animation
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Step 4: Clear existing value if requested
    if (clearFirst && element.value) {
      console.log('🧹 Clearing existing value...');
      clearInputValue(element);
      
      // Verify clearing worked
      if (element.value !== '') {
        console.warn('Failed to clear input value completely');
      }
    }
    
    // Step 5: Set the new address value
    console.log(`Setting input value to: "${address}"`);
    setInputValue(element, address);
    
    // Small delay to ensure events are processed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 6: Verify the input was set correctly
    if (verifyInput) {
      console.log('🔍 Verifying input value...');
      const isCorrect = verifyInputValue(element, address);
      
      if (!isCorrect) {
        console.error(`❌ Input verification failed. Expected: "${address}", Got: "${element.value}"`);
        result.error = 'Input verification failed';
        result.value = element.value;
        return result;
      }
    }
    
    result.success = true;
    result.value = element.value;
    
    console.log('✅ Address input automation completed successfully!');
    console.log(`📍 Final value: "${result.value}"`);
    
    return result;
    
  } catch (error) {
    console.error('💥 Automation error:', error);
    result.error = error instanceof Error ? error.message : 'Unknown error occurred';
    return result;
  }
}

/**
 * Convenience function to test the automation
 */
export async function testAddressAutomation(): Promise<void> {
  console.log('Starting address automation test...');
  
  const testAddress = '123 Main Street, New York, NY 10001';
  
  try {
    const result = await fillAddressInput(testAddress, {
      timeout: 10000,
      clearFirst: true,
      verifyInput: true,
      scrollIntoView: true
    });
    
    if (result.success) {
      console.log('Test completed successfully!');
      console.log(`Address filled: "${result.value}"`);
      console.log(`Element visible: ${result.elementVisible}`);
      console.log(`Element interactable: ${result.elementInteractable}`);
    } else {
      console.error('Test failed:', result.error);
      console.log(`Element found: ${result.elementFound}`);
      console.log(`Element visible: ${result.elementVisible}`);
      console.log(`Element interactable: ${result.elementInteractable}`);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

/**
 * Auto-detect and fill address input on page load
 */
export function setupAutoAddressDetection(): void {
  // Wait for DOM to be ready
  const initAutomation = () => {
    console.log('🔍 Setting up auto address detection...');
    
    // Look for address input fields
    const addressInputs = document.querySelectorAll('input[placeholder*="address" i], input[placeholder*="123 Main" i]');
    
    if (addressInputs.length > 0) {
      console.log(`✅ Found ${addressInputs.length} potential address input(s)`);
      
      // Add visual indicators to found inputs
      addressInputs.forEach((input, index) => {
        console.log(`📍 Input ${index + 1}:`, {
          placeholder: input.getAttribute('placeholder'),
          type: input.getAttribute('type'),
          id: input.getAttribute('id'),
          name: input.getAttribute('name')
        });
      });
    } else {
      console.log('No address inputs found on this page');
    }
  };
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAutomation);
  } else {
    initAutomation();
  }
}

// Define interface for window extension
interface WindowWithAddressAutomation extends Window {
  AddressAutomation?: {
    fillAddressInput: typeof fillAddressInput;
    testAddressAutomation: typeof testAddressAutomation;
    setupAutoAddressDetection: typeof setupAutoAddressDetection;
  };
}

// Export for global use
if (typeof window !== 'undefined') {
  (window as WindowWithAddressAutomation).AddressAutomation = {
    fillAddressInput,
    testAddressAutomation,
    setupAutoAddressDetection
  };
}