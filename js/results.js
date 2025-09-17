// Results page functionality
class ResultsApp {
    constructor() {
        this.results = null;
        this.currentFilter = 'all';
        this.filteredResults = [];
        
        this.init();
    }

    async init() {
        try {
            this.loadResults();
            this.setupEventListeners();
            this.displayResults();
        } catch (error) {
            console.error('Error initializing results:', error);
            this.showError('Չհաջողվեց բեռնել արդյունքները');
        }
    }

    loadResults() {
        const resultsData = sessionStorage.getItem('currentQuizResults');
        
        if (!resultsData) {
            this.redirectToHome('Արդյունքներ չգտնվեցին');
            return;
        }

        this.results = JSON.parse(resultsData);
        this.filteredResults = [...this.results.questionResults];
    }

    setupEventListeners() {
        // Back to tests button
        const backToTests = document.getElementById('backToTests');
        if (backToTests) {
            backToTests.addEventListener('click', () => {
                this.goToHome();
            });
        }

        // Retake test button
        const retakeTest = document.getElementById('retakeTest');
        if (retakeTest) {
            retakeTest.addEventListener('click', () => {
                this.retakeTest();
            });
        }

        // Next test button
        const nextTest = document.getElementById('nextTest');
        if (nextTest) {
            nextTest.addEventListener('click', () => {
                this.goToNextTest();
            });
        }

        // Print results button
        const printResults = document.getElementById('printResults');
        if (printResults) {
            printResults.addEventListener('click', () => {
                this.printResults();
            });
        }

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Update active state
                filterTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update filter
                this.currentFilter = e.target.dataset.filter;
                this.filterResults();
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.goToHome();
            }
        });
    }

    displayResults() {
        this.displayTestTitle();
        this.displayScoreSummary();
        this.displayDetailedResults();
    }

    displayTestTitle() {
        if (!this.results) return;

        // Update header title
        const testTitleHeader = document.getElementById('testTitleHeader');
        if (testTitleHeader) {
            testTitleHeader.textContent = this.results.testTitle;
        }

        // Update print title
        const testTitlePrint = document.getElementById('testTitlePrint');
        if (testTitlePrint) {
            testTitlePrint.textContent = this.results.testTitle;
        }

        // Update print date
        const printDate = document.getElementById('printDate');
        if (printDate) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('hy-AM', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            printDate.textContent = dateStr;
        }
    }

    displayScoreSummary() {
        
        if (!this.results) return;

        // Update score title and icon
        const scoreTitle = document.getElementById('scoreTitle');
        const scoreIcon = document.getElementById('scoreIcon');
        const scoreCard = document.querySelector('.score-card');
        
        if (scoreTitle && scoreIcon && scoreCard) {
            if (this.results.passed) {
                scoreTitle.textContent = 'Քննությունը հաջողությամբ ավարտված է!';
                scoreIcon.innerHTML = `
                    <div class="score-icon-success">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22,4 12,14.01 9,11.01"></polyline>
                        </svg>
                    </div>
                `;
                scoreIcon.className = 'score-icon success';
                scoreCard.classList.add('success');
                scoreCard.classList.remove('fail');
            } else {
                scoreTitle.textContent = 'Քննությունը անհաջող է ավարտվել';
                scoreIcon.innerHTML = `
                    <div class="score-icon-fail">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                `;
                scoreIcon.className = 'score-icon fail';
                scoreCard.classList.add('fail');
                scoreCard.classList.remove('success');
            }
        }

        // Update score values
        const totalScore = document.getElementById('totalScore');
        const correctAnswers = document.getElementById('correctAnswers');
        const incorrectAnswers = document.getElementById('incorrectAnswers');
        const timeSpent = document.getElementById('timeSpent');

        if (totalScore) {
            totalScore.textContent = `${this.results.correctAnswers}/${this.results.totalQuestions}`;
        }

        if (correctAnswers) {
            correctAnswers.textContent = this.results.correctAnswers;
        }

        if (incorrectAnswers) {
            incorrectAnswers.textContent = this.results.incorrectAnswers;
        }

        if (timeSpent) {
            timeSpent.textContent = this.results.timeSpent;
        }
    }

    filterResults() {
        if (!this.results) return;

        switch (this.currentFilter) {
            case 'correct':
                this.filteredResults = this.results.questionResults.filter(q => q.isCorrect && q.isAnswered);
                break;
            case 'incorrect':
                this.filteredResults = this.results.questionResults.filter(q => !q.isCorrect && q.isAnswered);
                break;
            case 'unanswered':
                this.filteredResults = this.results.questionResults.filter(q => !q.isAnswered);
                break;
            default: // 'all'
                this.filteredResults = [...this.results.questionResults];
                break;
        }

        this.displayDetailedResults();
    }

    displayDetailedResults() {
        const resultsList = document.getElementById('resultsList');
        if (!resultsList) return;

        Utils.DOMUtils.removeAllChildren(resultsList);

        if (this.filteredResults.length === 0) {
            this.displayEmptyResults(resultsList);
            return;
        }

        this.filteredResults.forEach((questionResult, index) => {
            const resultCard = this.createResultCard(questionResult);
            resultCard.classList.add('stagger-item');
            resultCard.style.setProperty('--stagger-delay', `${index * 0.1}s`);
            resultsList.appendChild(resultCard);
        });

        // Trigger stagger animation
        setTimeout(() => {
            const cards = resultsList.querySelectorAll('.result-card');
            cards.forEach(card => card.classList.add('animate-slideInUp'));
        }, 100);
    }

    createResultCard(questionResult) {
        const statusClass = questionResult.isAnswered 
            ? (questionResult.isCorrect ? 'correct' : 'incorrect')
            : 'unanswered';

        const statusIcon = this.getStatusIcon(questionResult);
        const statusText = this.getStatusText(questionResult);

        const card = Utils.DOMUtils.createElement('div', 
            `result-card ${statusClass}`,
            `
                <div class="result-card-header">
                    <div class="question-number">
                        <span>Հարց ${questionResult.questionNumber}</span>
                        <div class="status-badge ${statusClass}">
                            ${statusIcon}
                            <span>${statusText}</span>
                        </div>
                    </div>
                </div>
                <div class="result-card-body">
                    <div class="question-content">
                        <div class="question-text">${questionResult.questionText}</div>
                        ${questionResult.image ? `
                            <div class="question-image-container">
                                <img src="${Utils.DataLoader.getImagePath(this.results.testNumber, questionResult.image)}" 
                                     alt="Question ${questionResult.questionNumber} Image" 
                                     class="question-image">
                            </div>
                        ` : ''}
                    </div>
                    <div class="answers-review">
                        ${this.createAnswersReview(questionResult)}
                    </div>
                </div>
            `
        );

        return card;
    }

    createAnswersReview(questionResult) {
        return questionResult.answers.map((answer, index) => {
            const isUserAnswer = questionResult.userAnswerIndex === index;
            const isCorrectAnswer = questionResult.correctAnswerIndex === index;
            const letter = String.fromCharCode(65 + index);

            let answerClass = '';
            let answerIcon = '';

            if (isCorrectAnswer) {
                answerClass = 'correct-answer';
                answerIcon = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20,6 9,17 4,12"></polyline>
                    </svg>
                `;
            } else if (isUserAnswer && !isCorrectAnswer) {
                answerClass = 'wrong-answer';
                answerIcon = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                `;
            } else if (isUserAnswer) {
                answerClass = 'user-answer';
                answerIcon = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                    </svg>
                `;
            }

            return `
                <div class="answer-review ${answerClass} ${isUserAnswer ? 'user-selected' : ''}">
                    <div class="answer-letter">${letter}</div>
                    <div class="answer-text">${answer.answer_text}</div>
                    <div class="answer-status">
                        ${answerIcon}
                    </div>
                </div>
            `;
        }).join('');
    }

    getStatusIcon(questionResult) {
        if (!questionResult.isAnswered) {
            return `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            `;
        }

        if (questionResult.isCorrect) {
            return `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                </svg>
            `;
        }

        return `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        `;
    }

    getStatusText(questionResult) {
        if (!questionResult.isAnswered) {
            return 'Չպատասխանված';
        }

        return questionResult.isCorrect ? 'Ճիշտ' : 'Սխալ';
    }

    displayEmptyResults(container) {
        const emptyState = Utils.DOMUtils.createElement('div', 'empty-results-state', `
            <div class="empty-results-content">
                <div class="empty-results-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                </div>
                <h3>Հարցեր չգտնվեցին</h3>
                <p>Այս ֆիլտրով հարցեր չկան:</p>
            </div>
        `);
        
        container.appendChild(emptyState);
    }

    retakeTest() {
        if (!this.results) return;

        // Set current test number for retake
        sessionStorage.setItem('currentTestNumber', this.results.testNumber);
        
        // Navigate to quiz
        window.location.href = 'quiz.html';
    }

    goToNextTest() {
        if (!this.results) return;

        const nextTestNumber = this.results.testNumber + 1;
        
        if (nextTestNumber > 63) {
            Utils.NotificationUtils.info('Դուք արդեն ավարտել եք բոլոր թեստերը!');
            this.goToHome();
            return;
        }

        // Set next test number
        sessionStorage.setItem('currentTestNumber', nextTestNumber);
        
        // Navigate to quiz
        window.location.href = 'quiz.html';
    }

    goToHome() {
        // Clear all session data
        sessionStorage.clear();
        
        // Navigate to home
        window.location.href = 'index.html';
    }

    printResults() {
        window.print();
    }

    showError(message) {
        Utils.NotificationUtils.error(message, 5000);
        setTimeout(() => this.goToHome(), 3000);
    }

    redirectToHome(message = null) {
        if (message) {
            Utils.NotificationUtils.info(message);
        }
        this.goToHome();
    }
}

// Initialize the results app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.resultsApp = new ResultsApp();
});