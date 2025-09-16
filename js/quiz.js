// Quiz functionality
class QuizApp {
    constructor() {
        this.testData = null;
        this.currentQuestionIndex = 0;
        this.userAnswers = {};
        this.timeRemaining = 0;
        this.timer = null;
        this.startTime = null;
        this.testNumber = null;
        this.isSubmitted = false;
        
        this.init();
    }

    async init() {
        try {
            // Get test number from session storage
            this.testNumber = parseInt(sessionStorage.getItem('currentTestNumber'));
            
            if (!this.testNumber) {
                this.redirectToHome('Թեստի համարը չգտնվեց');
                return;
            }

            await this.loadTestData();
            this.setupEventListeners();
            this.initializeQuiz();
            this.startTimer();
            this.displayQuestion();
        } catch (error) {
            console.error('Error initializing quiz:', error);
            this.showError('Չհաջողվեց բեռնել թեստը');
        }
    }

    async loadTestData() {
        try {
            this.testData = await Utils.DataLoader.loadTestData(this.testNumber);
            
            if (!this.testData || !this.testData.questions) {
                throw new Error('Invalid test data');
            }
        } catch (error) {
            throw new Error(`Failed to load test ${this.testNumber}: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Navigation buttons
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');
        const questionsBtn = document.getElementById('questionsBtn');
        const exitBtn = document.getElementById('exitQuiz');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousQuestion());
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextQuestion());
        }

        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.showSubmitConfirmation());
        }

        if (questionsBtn) {
            questionsBtn.addEventListener('click', () => this.showQuestionsOverview());
        }

        if (exitBtn) {
            exitBtn.addEventListener('click', () => this.showExitConfirmation());
        }

        // Modal handlers
        this.setupModalHandlers();

        // Keyboard navigation
        this.setupKeyboardNavigation();

        // Touch/swipe gestures for mobile
        this.setupTouchGestures();

        // Prevent accidentally leaving the page
        this.setupPageLeaveProtection();
    }

    setupModalHandlers() {
        // Questions modal
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => {
                Utils.ModalUtils.hide('questionsModal');
            });
        }

        // Submit modal
        const closeSubmitModal = document.getElementById('closeSubmitModal');
        const cancelSubmit = document.getElementById('cancelSubmit');
        const confirmSubmit = document.getElementById('confirmSubmit');

        if (closeSubmitModal) {
            closeSubmitModal.addEventListener('click', () => {
                Utils.ModalUtils.hide('submitModal');
            });
        }

        if (cancelSubmit) {
            cancelSubmit.addEventListener('click', () => {
                Utils.ModalUtils.hide('submitModal');
            });
        }

        if (confirmSubmit) {
            confirmSubmit.addEventListener('click', () => {
                Utils.ModalUtils.hide('submitModal');
                this.submitQuiz();
            });
        }

        // Exit modal
        const cancelExit = document.getElementById('cancelExit');
        const confirmExit = document.getElementById('confirmExit');

        if (cancelExit) {
            cancelExit.addEventListener('click', () => {
                Utils.ModalUtils.hide('exitModal');
            });
        }

        if (confirmExit) {
            confirmExit.addEventListener('click', () => {
                this.exitQuiz();
            });
        }

        // Close modals when clicking outside
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                Utils.ModalUtils.hideAll();
            }
        });

        // Close modals with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                Utils.ModalUtils.hideAll();
            }
        });
    }

    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // Prevent keyboard navigation if modal is open
            if (document.querySelector('.modal.active')) {
                return;
            }

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    this.previousQuestion();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.nextQuestion();
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                    e.preventDefault();
                    const answerIndex = parseInt(e.key) - 1;
                    this.selectAnswer(answerIndex);
                    break;
                case 'Enter':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.showSubmitConfirmation();
                    }
                    break;
            }
        });
    }

    setupTouchGestures() {
        if (!Utils.DeviceUtils.isTouchDevice()) return;

        let startX = 0;
        let startY = 0;
        let startTime = 0;

        const questionCard = document.getElementById('questionCard');
        if (!questionCard) return;

        questionCard.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });

        questionCard.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();

            const deltaX = endX - startX;
            const deltaY = endY - startY;
            const deltaTime = endTime - startTime;

            // Check if it's a swipe (not a tap)
            if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 300) {
                if (deltaX > 0) {
                    // Swipe right - previous question
                    this.previousQuestion();
                } else {
                    // Swipe left - next question
                    this.nextQuestion();
                }
            }
        }, { passive: true });
    }

    setupPageLeaveProtection() {
        window.addEventListener('beforeunload', (e) => {
            if (!this.isSubmitted) {
                e.preventDefault();
                e.returnValue = 'Դուք վստա՞հ եք, որ ուզում եք լքել էջը: Ձեր առաջընթացը կկորի:';
                return e.returnValue;
            }
        });
    }

    initializeQuiz() {
        // Set quiz title
        const quizTitle = document.getElementById('quizTitle');
        if (quizTitle && this.testData) {
            quizTitle.textContent = this.testData.title;
        }

        // Set total questions
        const totalQuestions = document.getElementById('totalQuestions');
        if (totalQuestions && this.testData) {
            totalQuestions.textContent = this.testData.questions.length;
        }

        // Initialize timer
        this.timeRemaining = this.testData.duration * 60; // Convert to seconds
        this.startTime = Date.now();

        // Initialize progress
        this.createProgressDots();
        this.updateProgress();

        // Initialize user answers (empty)
        this.userAnswers = {};
    }

    createProgressDots() {
        const progressContainer = document.getElementById('questionsProgress');
        if (!progressContainer || !this.testData) return;

        Utils.DOMUtils.removeAllChildren(progressContainer);

        this.testData.questions.forEach((_, index) => {
            const dot = Utils.DOMUtils.createElement('div', 'progress-dot', (index + 1).toString());
            dot.addEventListener('click', () => this.goToQuestion(index));
            progressContainer.appendChild(dot);
        });

        // Add scroll behavior for mobile landscape
        if (Utils.DeviceUtils.isMobile()) {
            this.setupProgressScroll();
        }
    }

    setupProgressScroll() {
        const progressContainer = document.getElementById('questionsProgress');
        if (!progressContainer) return;

        // Auto-scroll to current question on mobile landscape
        const scrollToCurrentDot = () => {
            const currentDot = progressContainer.querySelector('.progress-dot.current');
            if (currentDot && window.innerHeight < window.innerWidth) {
                currentDot.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        };

        // Call when question changes
        setTimeout(scrollToCurrentDot, 100);
    }

    startTimer() {
        this.updateTimerDisplay();
        
        this.timer = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();

            if (this.timeRemaining <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const timerDisplay = document.getElementById('timerDisplay');
        const timerElement = document.getElementById('timer');
        
        if (timerDisplay) {
            timerDisplay.textContent = Utils.TimeUtils.formatTime(this.timeRemaining);
        }

        // Update timer appearance based on remaining time
        if (timerElement) {
            timerElement.classList.remove('warning', 'danger');
            
            if (this.timeRemaining <= 300) { // Last 5 minutes
                timerElement.classList.add('warning');
            }
            
            if (this.timeRemaining <= 60) { // Last minute
                timerElement.classList.add('danger');
            }
        }
    }

    displayQuestion() {
        if (!this.testData || !this.testData.questions[this.currentQuestionIndex]) {
            return;
        }

        const question = this.testData.questions[this.currentQuestionIndex];
        
        // Update question text
        const questionText = document.getElementById('questionText');
        if (questionText) {
            questionText.textContent = question.question_text;
        }

        // Update question image
        this.displayQuestionImage(question);

        // Update answers
        this.displayAnswers(question);

        // Update current question number
        const currentQuestion = document.getElementById('currentQuestion');
        if (currentQuestion) {
            currentQuestion.textContent = this.currentQuestionIndex + 1;
        }

        // Update navigation buttons
        this.updateNavigationButtons();

        // Update progress
        this.updateProgress();

        // Animate question appearance
        const questionCard = document.getElementById('questionCard');
        if (questionCard) {
            questionCard.classList.add('animate-slideIn');
            setTimeout(() => questionCard.classList.remove('animate-slideIn'), 500);
        }
    }

    displayQuestionImage(question) {
        const imageContainer = document.getElementById('questionImageContainer');
        const image = document.getElementById('questionImage');
        
        if (!imageContainer || !image) return;

        if (question.image) {
            const imagePath = Utils.DataLoader.getImagePath(this.testNumber, question.image);
            image.src = imagePath;
            image.alt = `Question ${this.currentQuestionIndex + 1} Image`;
            imageContainer.style.display = 'block';

            // Handle image load errors
            image.onerror = () => {
                console.warn(`Failed to load image: ${imagePath}`);
                imageContainer.style.display = 'none';
            };
        } else {
            imageContainer.style.display = 'none';
        }
    }

    displayAnswers(question) {
        const answersContainer = document.getElementById('answersContainer');
        if (!answersContainer) return;

        Utils.DOMUtils.removeAllChildren(answersContainer);

        question.answers.forEach((answer, index) => {
            const answerElement = this.createAnswerElement(answer, index);
            answersContainer.appendChild(answerElement);
        });
    }

    createAnswerElement(answer, index) {
        const isSelected = this.userAnswers[this.currentQuestionIndex] === index;
        const letter = String.fromCharCode(65 + index); // A, B, C, D

        const answerElement = Utils.DOMUtils.createElement('div', 
            `answer-option ${isSelected ? 'selected' : ''}`,
            `
                <div class="answer-letter">${letter}</div>
                <div class="answer-text">${answer.answer_text}</div>
            `
        );

        answerElement.addEventListener('click', () => this.selectAnswer(index));

        // Add touch feedback for mobile
        if (Utils.DeviceUtils.isTouchDevice()) {
            answerElement.addEventListener('touchstart', () => {
                answerElement.style.transform = 'scale(0.98)';
            }, { passive: true });

            answerElement.addEventListener('touchend', () => {
                answerElement.style.transform = '';
            }, { passive: true });
        }

        return answerElement;
    }

    selectAnswer(answerIndex) {
        if (!this.testData || !this.testData.questions[this.currentQuestionIndex]) {
            return;
        }

        const question = this.testData.questions[this.currentQuestionIndex];
        
        if (answerIndex < 0 || answerIndex >= question.answers.length) {
            return;
        }

        // Update user answers
        this.userAnswers[this.currentQuestionIndex] = answerIndex;

        // Update UI
        const answers = document.querySelectorAll('.answer-option');
        answers.forEach((answer, index) => {
            answer.classList.toggle('selected', index === answerIndex);
        });

        // Update progress display
        this.updateProgress();

        // Remove auto-advance functionality - let user navigate manually
    }

    goToQuestion(questionIndex) {
        if (!Utils.ValidationUtils.isValidQuestionIndex(questionIndex, this.testData.questions.length)) {
            return;
        }

        this.currentQuestionIndex = questionIndex;
        this.displayQuestion();
    }

    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
            this.displayQuestion();
        }
    }

    nextQuestion() {
        if (this.currentQuestionIndex < this.testData.questions.length - 1) {
            this.currentQuestionIndex++;
            this.displayQuestion();
        }
    }

    updateNavigationButtons() {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const submitBtn = document.getElementById('submitBtn');

        if (prevBtn) {
            prevBtn.disabled = this.currentQuestionIndex === 0;
        }

        const isLastQuestion = this.currentQuestionIndex === this.testData.questions.length - 1;

        if (nextBtn && submitBtn) {
            if (isLastQuestion) {
                nextBtn.style.display = 'none';
                submitBtn.style.display = 'flex';
            } else {
                nextBtn.style.display = 'flex';
                submitBtn.style.display = 'none';
            }
        }
    }

    updateProgress() {
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        if (progressFill) {
            const progress = ((this.currentQuestionIndex + 1) / this.testData.questions.length) * 100;
            progressFill.style.width = `${progress}%`;
        }

        // Update progress dots - Yellow for answered questions
        const dots = document.querySelectorAll('.progress-dot');
        dots.forEach((dot, index) => {
            dot.classList.remove('current', 'answered');
            
            if (index === this.currentQuestionIndex) {
                dot.classList.add('current');
            }
            
            if (this.userAnswers[index] !== undefined) {
                dot.classList.add('answered'); // This will be yellow per CSS
            }
        });

        // Auto-scroll to current dot on mobile
        if (Utils.DeviceUtils.isMobile()) {
            this.setupProgressScroll();
        }
    }

    showQuestionsOverview() {
        const questionsOverview = document.getElementById('questionsOverview');
        if (!questionsOverview) return;

        Utils.DOMUtils.removeAllChildren(questionsOverview);

        this.testData.questions.forEach((_, index) => {
            const isAnswered = this.userAnswers[index] !== undefined;
            const isCurrent = index === this.currentQuestionIndex;
            
            const item = Utils.DOMUtils.createElement('div', 
                `question-overview-item ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`,
                (index + 1).toString()
            );

            item.addEventListener('click', () => {
                this.goToQuestion(index);
                Utils.ModalUtils.hide('questionsModal');
            });

            questionsOverview.appendChild(item);
        });

        Utils.ModalUtils.show('questionsModal');
    }

    showExitConfirmation() {
        Utils.ModalUtils.show('exitModal');
    }

    showSubmitConfirmation() {
        const unansweredCount = this.testData.questions.length - Object.keys(this.userAnswers).length;
        
        // Update submit message
        const submitMessage = document.getElementById('submitMessage');
        const unansweredInfo = document.getElementById('unansweredInfo');
        const unansweredCountEl = document.getElementById('unansweredCount');
        
        if (submitMessage) {
            if (unansweredCount > 0) {
                submitMessage.textContent = 'Դուք ունեք չպատասխանված հարցեր: Վստա՞հ եք, որ ուզում եք ավարտել քննությունը:';
            } else {
                submitMessage.textContent = 'Դուք պատասխանել եք բոլոր հարցերին: Վստա՞հ եք, որ ուզում եք ավարտել քննությունը:';
            }
        }
        
        if (unansweredInfo && unansweredCountEl) {
            if (unansweredCount > 0) {
                unansweredCountEl.textContent = unansweredCount;
                unansweredInfo.style.display = 'block';
            } else {
                unansweredInfo.style.display = 'none';
            }
        }
        
        Utils.ModalUtils.show('submitModal');
    }

    async submitQuiz() {
        try {
            this.isSubmitted = true;
            this.stopTimer();
            
            const results = this.calculateResults();
            
            // Store results in session storage (temporary)
            sessionStorage.setItem('currentQuizResults', JSON.stringify(results));
            
            // Navigate to results page
            window.location.href = 'results.html';
            
        } catch (error) {
            console.error('Error submitting quiz:', error);
            Utils.NotificationUtils.error('Չհաջողվեց ցուցացնել արդյունքները');
        }
    }

    calculateResults() {
        const totalQuestions = this.testData.questions.length;
        let correctAnswers = 0;
        let incorrectAnswers = 0;
        let unansweredQuestions = [];
        const questionResults = [];

        this.testData.questions.forEach((question, questionIndex) => {
            const userAnswerIndex = this.userAnswers[questionIndex];
            const questionResult = {
                questionNumber: questionIndex + 1,
                questionText: question.question_text,
                image: question.image,
                userAnswerIndex: userAnswerIndex,
                correctAnswerIndex: question.answers.findIndex(answer => answer.is_correct),
                answers: question.answers,
                isCorrect: false,
                isAnswered: userAnswerIndex !== undefined
            };

            if (userAnswerIndex !== undefined) {
                questionResult.isCorrect = question.answers[userAnswerIndex].is_correct;
                if (questionResult.isCorrect) {
                    correctAnswers++;
                } else {
                    incorrectAnswers++;
                }
            } else {
                unansweredQuestions.push(questionIndex + 1);
            }

            questionResults.push(questionResult);
        });

        const timeSpent = this.testData.duration * 60 - this.timeRemaining;
        const passed = incorrectAnswers <= this.testData.max_wrong_answers;

        return {
            testNumber: this.testNumber,
            testTitle: this.testData.title,
            totalQuestions,
            correctAnswers,
            incorrectAnswers,
            unansweredCount: unansweredQuestions.length,
            unansweredQuestions,
            passed,
            timeSpent: Utils.TimeUtils.formatTime(timeSpent),
            timeSpentSeconds: timeSpent,
            maxWrongAnswers: this.testData.max_wrong_answers,
            questionResults,
            completedAt: new Date().toISOString()
        };
    }

    stopTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    timeUp() {
        this.stopTimer();
        Utils.NotificationUtils.warning('Ժամանակը սպառվեց!', 3000);
        
        setTimeout(() => {
            this.submitQuiz();
        }, 2000);
    }

    exitQuiz() {
        this.stopTimer();
        Utils.ModalUtils.hideAll();
        this.redirectToHome();
    }

    redirectToHome(message = null) {
        if (message) {
            Utils.NotificationUtils.info(message);
        }
        window.location.href = 'index.html';
    }

    showError(message) {
        Utils.NotificationUtils.error(message, 5000);
        setTimeout(() => this.redirectToHome(), 3000);
    }
}

// Initialize the quiz when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});