# Prescribed Fire GPT

An AI-powered system for prescribed fire management, inspired by Argonne National Laboratory's WildfireGPT research. This platform combines domain-specific fire management knowledge with advanced language models to support safer, more effective prescribed fire operations.

## 🔥 Overview

Prescribed Fire GPT is a comprehensive fire management platform that leverages artificial intelligence to assist fire managers, researchers, and practitioners in planning, executing, and evaluating prescribed fire operations. The system integrates weather data, vegetation analysis, historical burn records, and scientific literature to provide intelligent recommendations.

## ✨ Key Features

### 🤖 AI Assistant
- **Domain-Specific Knowledge**: Trained on prescribed fire management literature and best practices
- **Interactive Consultation**: Natural language interface for fire planning questions  
- **RAG Framework**: Retrieval-Augmented Generation for scientific literature integration
- **Real-time Recommendations**: Context-aware suggestions based on current conditions

### 📊 Fire Planning Tools
- **Comprehensive Planning Interface**: Step-by-step burn plan development
- **Weather Integration**: Real-time weather monitoring and forecasting
- **Prescription Development**: Automated parameter setting based on conditions
- **Resource Calculation**: Crew and equipment requirement estimation

### 🛡️ Risk Assessment
- **Multi-Factor Analysis**: Weather, fuel, topography, and operational factors
- **Dynamic Risk Scoring**: Real-time risk level updates
- **Safety Recommendations**: Automated safety protocol suggestions
- **Historical Risk Analysis**: Trend analysis and pattern recognition

### 📈 Data Explorer
- **Fire Operations Dashboard**: Track burns, acreage, and success rates
- **Interactive Visualizations**: Charts and maps for data analysis
- **Performance Metrics**: Success rate tracking and outcome analysis
- **Historical Data Analysis**: Long-term trend identification

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (for AI features)
- Supabase account (for data storage)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd prescribed-fire-gpt
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file with the following variables:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Supabase Configuration
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   ```

4. **Database Setup**
   ```bash
   npm run supabase:setup
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🏗️ Architecture

### Frontend
- **Next.js 15**: React framework with App Router
- **Tailwind CSS**: Utility-first styling
- **Framer Motion**: Smooth animations and interactions
- **Lucide React**: Consistent iconography
- **Chart.js & Plotly**: Data visualization

### Backend
- **Next.js API Routes**: Server-side functionality
- **Supabase**: Database and authentication
- **OpenAI GPT-4**: AI assistant capabilities
- **LangChain**: RAG framework implementation

### AI System
- **Retrieval-Augmented Generation (RAG)**: Context-aware responses
- **Domain-Specific Training**: Fire management knowledge base
- **Multi-Modal Input**: Text, weather data, and geospatial information
- **Safety-First Design**: Prioritizes operational safety in all recommendations

## 📚 Knowledge Base

The system incorporates comprehensive fire management knowledge including:

- **Weather Prescriptions**: Optimal conditions for different ecosystems
- **Fuel Moisture Guidelines**: Critical thresholds and safety margins
- **Safety Protocols**: Crew management and emergency procedures
- **Ecosystem-Specific Guidelines**: Tailored approaches for different vegetation types
- **Regulatory Compliance**: Permit requirements and notification procedures

## 🎯 Use Cases

### Fire Managers
- Pre-burn planning and prescription development
- Real-time operational decision support
- Post-burn evaluation and reporting
- Crew training and knowledge transfer

### Researchers
- Data analysis and pattern identification
- Outcome evaluation and effectiveness studies
- Literature review and synthesis
- Publication-ready data visualization

### Land Managers
- Long-term fire program planning
- Resource allocation optimization
- Stakeholder communication
- Compliance documentation

## 🔧 API Reference

### AI Assistant Endpoint
```javascript
POST /api/ai/prescribed-fire
{
  "message": "What weather conditions are optimal for burning oak woodland?",
  "history": [...previous_messages]
}
```

### Risk Assessment
```javascript
POST /api/risk-assessment
{
  "location": "coordinates",
  "conditions": {...environmental_data},
  "operations": {...operational_factors}
}
```

## 📖 Scientific Foundation

This system is inspired by and builds upon research from:

- **Argonne National Laboratory's WildfireGPT**: Advanced AI for wildfire analysis
- **NWCG Fire Behavior Guidelines**: Standardized fire management protocols  
- **Interagency Prescribed Fire Standards**: Safety and operational best practices
- **University Research**: Latest findings in fire ecology and management

## 🛡️ Safety Features

- **Safety-First AI**: All recommendations prioritize crew and public safety
- **Risk Escalation**: Automatic alerts for dangerous conditions
- **Emergency Protocols**: Integrated emergency response procedures
- **Validation Systems**: Cross-checks against established safety standards

## 🤝 Contributing

We welcome contributions from the fire management community:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution
- Additional knowledge base content
- New visualization components
- Regional fire management protocols
- Integration with weather services
- Mobile optimization

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Argonne National Laboratory**: For pioneering WildfireGPT research
- **Stanford University**: For institutional support and research collaboration
- **NWCG**: For fire management standards and protocols
- **Fire Management Community**: For domain expertise and feedback

## 📞 Support

For questions, support, or collaboration opportunities:

- **Documentation**: [Link to docs]
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [Contact email]

---

**⚠️ Important Safety Notice**: This system provides decision support tools but does not replace professional fire management expertise, local knowledge, or official safety protocols. Always consult with certified burn bosses and follow local regulations for prescribed fire operations.