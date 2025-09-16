import json
import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, ElementClickInterceptedException, WebDriverException
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class AvtodprocScraper:
    def __init__(self, headless=True):
        self.base_url = "https://www.avtodproc.com/hy-am/exam-tests"
        self.api_base = "https://api.avtodproc.com/storage/uploads/exam-test-questions/"
        self.data_dir = "scraped_data"
        self.images_base_dir = os.path.join(self.data_dir, "images")
        self.all_tests_data = []
        self.headless = headless
        
        # Create directories
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.images_base_dir, exist_ok=True)
        
        self.driver = None
        self.init_driver()
        
    def init_driver(self):
        """Initialize Chrome driver with options"""
        # Setup Chrome options
        chrome_options = Options()
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument('--disable-popup-blocking')
        chrome_options.add_argument('--no-first-run')
        chrome_options.add_argument('--disable-notifications')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--no-sandbox')
        
        # Add headless mode
        if self.headless:
            chrome_options.add_argument('--headless')
            chrome_options.add_argument('--window-size=1920,1080')
            logging.info("Running in headless mode")
        
        # Enable Chrome DevTools Protocol
        chrome_options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
        
        # Initialize driver
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
                
        self.driver = webdriver.Chrome(options=chrome_options)
        
        if not self.headless:
            self.driver.maximize_window()
        
        logging.info("Driver initialized successfully")
    
    def restart_driver(self):
        """Restart the Chrome driver"""
        logging.info("Restarting Chrome driver...")
        self.init_driver()
        time.sleep(2)
    
    def safe_click(self, element):
        """Safely click an element with multiple fallback methods"""
        try:
            # Method 1: Scroll into view and regular click
            self.driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
            time.sleep(0.5)
            element.click()
            return True
        except (ElementClickInterceptedException, WebDriverException):
            pass
        
        try:
            # Method 2: JavaScript click
            self.driver.execute_script("arguments[0].click();", element)
            return True
        except:
            pass
        
        try:
            # Method 3: ActionChains click
            ActionChains(self.driver).move_to_element(element).click().perform()
            return True
        except:
            pass
        
        return False
    
    def download_image(self, image_name, test_number):
        """Download image and save it in test-specific folder"""
        if not image_name:
            return None
        
        # Create test-specific image folder
        test_image_dir = os.path.join(self.images_base_dir, str(test_number))
        os.makedirs(test_image_dir, exist_ok=True)
        
        image_url = f"{self.api_base}{image_name}"
        image_path = os.path.join(test_image_dir, image_name)
        
        # Skip if already downloaded
        if os.path.exists(image_path):
            logging.info(f"  Image already exists: {image_name}")
            return image_path
            
        try:
            response = requests.get(image_url, timeout=10, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            if response.status_code == 200:
                with open(image_path, 'wb') as f:
                    f.write(response.content)
                logging.info(f"  Downloaded image: {image_name} to test_{test_number} folder")
                return image_path
            else:
                logging.warning(f"  Failed to download image: {image_name} (Status: {response.status_code})")
                return None
        except Exception as e:
            logging.error(f"  Error downloading image {image_name}: {e}")
            return None
    
    def extract_test_data_from_network(self, test_number, retry_count=3):
        """Extract test data with retry and error handling"""
        for attempt in range(retry_count):
            try:
                logging.info(f"\n{'='*50}")
                logging.info(f"Extracting Test {test_number} (Attempt {attempt + 1}/{retry_count})")
                logging.info('='*50)
                
                # Go to main page
                self.driver.get(self.base_url)
                time.sleep(3)
                
                # Execute JavaScript to intercept fetch/XHR responses
                self.driver.execute_script("""
                    window.capturedData = null;
                    const originalFetch = window.fetch;
                    window.fetch = function(...args) {
                        return originalFetch.apply(this, args).then(response => {
                            const clonedResponse = response.clone();
                            clonedResponse.json().then(data => {
                                if (data.pageProps && data.pageProps.userExamTest) {
                                    window.capturedData = data;
                                }
                            }).catch(() => {});
                            return response;
                        });
                    };
                """)
                
                # Find the test button
                test_button = WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, f"//span[contains(text(), 'Թեստ {test_number}')]"))
                )
                
                # Try to click the test button safely
                clicked = False
                
                # Try clicking the span itself
                if self.safe_click(test_button):
                    clicked = True
                else:
                    # Try clicking the parent button
                    try:
                        parent_button = test_button.find_element(By.XPATH, "./..")
                        if self.safe_click(parent_button):
                            clicked = True
                    except:
                        pass
                
                if not clicked:
                    # Last resort: try clicking grandparent
                    try:
                        grandparent = test_button.find_element(By.XPATH, "./../..")
                        self.safe_click(grandparent)
                        clicked = True
                    except:
                        pass
                
                if not clicked:
                    raise ElementClickInterceptedException("Could not click test button")
                
                time.sleep(5)  # Wait for page to load
                
                # Try to get data from window.capturedData
                captured_data = self.driver.execute_script("return window.capturedData;")
                
                if not captured_data:
                    # Alternative: Try to extract from __NEXT_DATA__ script tag
                    try:
                        next_data = self.driver.execute_script("""
                            const scripts = document.querySelectorAll('script');
                            for (let script of scripts) {
                                if (script.id === '__NEXT_DATA__') {
                                    return JSON.parse(script.textContent);
                                }
                            }
                            return null;
                        """)
                        if next_data and 'props' in next_data and 'pageProps' in next_data['props']:
                            captured_data = next_data['props']
                    except:
                        pass
                
                if captured_data and 'pageProps' in captured_data:
                    test_data = captured_data['pageProps']['userExamTest']
                    processed_test = self.process_test_data(test_data, test_number)
                    self.all_tests_data.append(processed_test)
                    
                    # Save individual test data
                    test_file = os.path.join(self.data_dir, f"test_{test_number}.json")
                    with open(test_file, 'w', encoding='utf-8') as f:
                        json.dump(processed_test, f, ensure_ascii=False, indent=2)
                    
                    logging.info(f"✓ Successfully extracted Test {test_number}")
                    logging.info(f"  - Questions: {len(processed_test['questions'])}")
                    logging.info(f"  - Duration: {processed_test['duration']} minutes")
                    logging.info(f"  - Max wrong answers: {processed_test['max_wrong_answers']}")
                    
                    return True
                else:
                    logging.warning(f"No data captured for Test {test_number} on attempt {attempt + 1}")
                    
            except (ElementClickInterceptedException, WebDriverException) as e:
                logging.error(f"Click/Driver error on attempt {attempt + 1} for Test {test_number}: {e}")
                if "click intercepted" in str(e).lower() or "not clickable" in str(e).lower():
                    logging.info("Detected click interception - will restart driver")
                    break  # Break out of retry loop to restart driver
                    
            except TimeoutException:
                logging.error(f"Timeout on attempt {attempt + 1} for Test {test_number}")
            except Exception as e:
                logging.error(f"General error on attempt {attempt + 1} for Test {test_number}: {e}")
                
            # Wait before retry
            if attempt < retry_count - 1:
                time.sleep(3)
        
        logging.error(f"✗ Failed to extract Test {test_number} after {retry_count} attempts")
        return False
    
    def process_test_data(self, raw_data, test_number):
        """Process and clean the test data"""
        exam_test = raw_data.get('exam_test', {})
        
        processed_test = {
            'test_number': test_number,
            'test_id': exam_test.get('id'),
            'title': f"Թեստ {test_number}",
            'duration': exam_test.get('duration', 30),
            'max_wrong_answers': exam_test.get('max_wrong_answers', 2),
            'questions': []
        }
        
        # Process each question
        for idx, question in enumerate(exam_test.get('questions', []), 1):
            logging.info(f"  Processing question {idx}...")
            
            # Download image if exists
            image_name = question.get('image')
            image_path = None
            if image_name:
                image_path = self.download_image(image_name, test_number)
            
            # Extract question data
            processed_question = {
                'question_number': idx,
                'question_id': question.get('id'),
                'question_text': question.get('translation', {}).get('title', ''),
                'image': image_name,
                'image_local_path': image_path,
                'answers': []
            }
            
            # Process answers
            for answer in question.get('answers', []):
                processed_answer = {
                    'answer_id': answer.get('id'),
                    'answer_text': answer.get('translation', {}).get('title', ''),
                    'is_correct': answer.get('is_right', False)
                }
                processed_question['answers'].append(processed_answer)
            
            # Add explanation if exists
            explanation = question.get('explanation', {})
            if explanation and explanation.get('translation'):
                processed_question['explanation'] = {
                    'title': explanation.get('translation', {}).get('title', ''),
                    'description': explanation.get('translation', {}).get('description', '')
                }
            
            processed_test['questions'].append(processed_question)
        
        return processed_test
    
    def get_existing_tests(self):
        """Check which tests have already been scraped"""
        existing_tests = []
        for i in range(1, 64):
            test_file = os.path.join(self.data_dir, f"test_{i}.json")
            if os.path.exists(test_file):
                existing_tests.append(i)
        return existing_tests
    
    def save_progress(self, current_test):
        """Save current progress to a file"""
        progress_file = os.path.join(self.data_dir, "progress.txt")
        with open(progress_file, 'w') as f:
            f.write(str(current_test))
    
    def load_progress(self):
        """Load progress from file"""
        progress_file = os.path.join(self.data_dir, "progress.txt")
        if os.path.exists(progress_file):
            try:
                with open(progress_file, 'r') as f:
                    return int(f.read().strip())
            except:
                pass
        return 1
    
    def scrape_all_tests_with_restart(self, start_test=None, end_test=63):
        """Scrape all tests with automatic restart on errors"""
        if start_test is None:
            # Check for existing progress or tests
            existing_tests = self.get_existing_tests()
            if existing_tests:
                start_test = max(existing_tests) + 1
                logging.info(f"Found existing tests up to {max(existing_tests)}, starting from {start_test}")
            else:
                start_test = self.load_progress()
                logging.info(f"Starting from test {start_test}")
        
        current_test = start_test
        successful = 0
        
        while current_test <= end_test:
            try:
                # Save current progress
                self.save_progress(current_test)
                
                success = self.extract_test_data_from_network(current_test)
                
                if success:
                    successful += 1
                    current_test += 1
                else:
                    # Check if it's a click interception error
                    logging.warning(f"Failed to extract Test {current_test}, restarting driver...")
                    self.restart_driver()
                    time.sleep(3)
                    
                    # Try one more time with restarted driver
                    success = self.extract_test_data_from_network(current_test)
                    if success:
                        successful += 1
                        current_test += 1
                    else:
                        logging.error(f"Failed Test {current_test} even after restart, skipping...")
                        current_test += 1
                
                # Small delay between tests
                time.sleep(2)
                
            except Exception as e:
                logging.error(f"Unexpected error during Test {current_test}: {e}")
                logging.info("Restarting driver due to unexpected error...")
                self.restart_driver()
                time.sleep(3)
        
        # Create combined all_tests.json
        self.create_combined_file()
        
        logging.info(f"\n{'='*50}")
        logging.info(f"Scraping Complete!")
        logging.info(f"  - Successfully scraped: {successful} tests")
        logging.info(f"  - Range: {start_test} to {end_test}")
        logging.info(f"  - Data saved to: {self.data_dir}")
        logging.info('='*50)
        
        # Clean up progress file
        progress_file = os.path.join(self.data_dir, "progress.txt")
        if os.path.exists(progress_file):
            os.remove(progress_file)
        
        return successful
    
    def create_combined_file(self):
        """Create combined all_tests.json from individual test files"""
        all_tests = []
        
        for i in range(1, 64):
            test_file = os.path.join(self.data_dir, f"test_{i}.json")
            if os.path.exists(test_file):
                with open(test_file, 'r', encoding='utf-8') as f:
                    test_data = json.load(f)
                    all_tests.append(test_data)
        
        # Sort by test number
        all_tests.sort(key=lambda x: x.get('test_number', 0))
        
        # Save combined file
        all_tests_file = os.path.join(self.data_dir, "all_tests.json")
        with open(all_tests_file, 'w', encoding='utf-8') as f:
            json.dump(all_tests, f, ensure_ascii=False, indent=2)
        
        logging.info(f"Created combined file with {len(all_tests)} tests")
    
    def close(self):
        """Close the browser"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass

# Main execution function
def main():
    # Initialize scraper in headless mode
    scraper = AvtodprocScraper(headless=True)
    
    try:
        # Start scraping all tests with auto-restart
        scraper.scrape_all_tests_with_restart(start_test=28, end_test=63)
        
    finally:
        scraper.close()

def continue_scraping(from_test=None):
    """Continue scraping from a specific test or auto-detect"""
    scraper = AvtodprocScraper(headless=True)
    
    try:
        scraper.scrape_all_tests_with_restart(start_test=from_test, end_test=63)
    finally:
        scraper.close()

if __name__ == "__main__":
    # Option 1: Start from beginning (will auto-detect existing tests)
    main()
    
    # Option 2: Continue from specific test
    # continue_scraping(from_test=28)
    
    # Option 3: Non-headless mode for debugging
    # scraper = AvtodprocScraper(headless=False)
    # try:
    #     scraper.scrape_all_tests_with_restart(27, 30)
    # finally:
    #     scraper.close()