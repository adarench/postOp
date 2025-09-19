import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { RiskLevel } from '@/types';

interface TemplateSelectorProps {
  patientName: string;
  riskLevel: RiskLevel;
  dayPostOp: number;
  onSend: (template: string, customMessage: string) => Promise<void>;
  onClose: () => void;
}

interface Template {
  id: string;
  name: string;
  category: 'reassure' | 'care_steps' | 'red_flags';
  content: string;
}

const TEMPLATES: Template[] = [
  // Reassurance templates
  {
    id: 'normal_day',
    name: 'Normal Day Progress',
    category: 'reassure',
    content: 'Thanks for the update, {{first_name}}! This sounds typical for Day {{day}}. {{day_tip}} Continue following your post-op instructions.'
  },
  {
    id: 'mild_discomfort',
    name: 'Mild Discomfort',
    category: 'reassure',
    content: 'Hi {{first_name}}, some discomfort is expected at this stage. Keep taking your medications as prescribed and use ice 20 minutes on, 20 minutes off.'
  },
  {
    id: 'swelling_normal',
    name: 'Normal Swelling',
    category: 'reassure',
    content: 'Hi {{first_name}}, the swelling you\'re experiencing is normal for Day {{day}}. Keep your head elevated when resting and continue icing as instructed.'
  },

  // Care steps templates
  {
    id: 'pain_management',
    name: 'Pain Management',
    category: 'care_steps',
    content: 'Hi {{first_name}}, for moderate pain on Day {{day}}: 1) Take medications exactly as prescribed 2) Ice 20 min on/20 off 3) Keep head elevated 4) Rest and avoid strenuous activity.'
  },
  {
    id: 'bleeding_care',
    name: 'Bleeding Care Instructions',
    category: 'care_steps',
    content: 'Hi {{first_name}}, for light bleeding: 1) Apply gentle pressure with clean gauze 2) Keep head elevated 3) Avoid bending over 4) No nose blowing. Call if bleeding increases significantly.'
  },
  {
    id: 'swelling_care',
    name: 'Swelling Management',
    category: 'care_steps',
    content: 'Hi {{first_name}}, to manage swelling: 1) Ice 20 minutes on, 20 off 2) Sleep with head elevated 3) Avoid salty foods 4) Stay hydrated. Peak swelling typically occurs Days 2-3.'
  },

  // Red flag templates
  {
    id: 'fever_urgent',
    name: 'Fever - Call Now',
    category: 'red_flags',
    content: 'Hi {{first_name}}, fever above 101°F needs evaluation. Please call our office immediately at (555) 123-4567. If after hours, go to urgent care or ER.'
  },
  {
    id: 'severe_symptoms',
    name: 'Severe Symptoms',
    category: 'red_flags',
    content: 'Hi {{first_name}}, your symptoms may need prompt attention. Our team has been alerted. If symptoms worsen or you feel unsafe, go to the ER immediately. We\'ll follow up shortly.'
  },
  {
    id: 'heavy_bleeding',
    name: 'Heavy Bleeding',
    category: 'red_flags',
    content: 'Hi {{first_name}}, heavy bleeding needs immediate attention. Apply pressure and go to the ER now. Call us at (555) 123-4567 to let us know you\'re going.'
  }
];

export default function TemplateSelector({
  patientName,
  riskLevel,
  dayPostOp,
  onSend,
  onClose
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<'reassure' | 'care_steps' | 'red_flags'>(
    riskLevel === 'red' ? 'red_flags' : riskLevel === 'yellow' ? 'care_steps' : 'reassure'
  );
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { id: 'reassure', name: 'Reassure', color: 'text-green-700 bg-green-50 border-green-200' },
    { id: 'care_steps', name: 'Care Steps', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { id: 'red_flags', name: 'Red Flags', color: 'text-red-700 bg-red-50 border-red-200' }
  ] as const;

  const filteredTemplates = TEMPLATES.filter(t => t.category === selectedCategory);

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    // Replace template variables
    let message = template.content;
    message = message.replace(/{{first_name}}/g, patientName);
    message = message.replace(/{{day}}/g, dayPostOp.toString());

    // Add day-specific tip if needed
    if (message.includes('{{day_tip}}')) {
      const dayTip = getDayTip(dayPostOp);
      message = message.replace(/{{day_tip}}/g, dayTip);
    }

    setCustomMessage(message);
  };

  const handleSend = async () => {
    if (!customMessage.trim()) return;

    setIsLoading(true);
    try {
      await onSend(selectedTemplate?.id || 'custom', customMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition.Root show={true} as={Fragment}>
      <Dialog as="div" className="relative z-20" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                <div className="bg-white">
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">
                        Send Message Template
                      </h3>
                      <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 rounded-md p-1 hover:bg-gray-100"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      To {patientName} (Day {dayPostOp})
                    </p>
                  </div>

                  {/* Category tabs */}
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex space-x-1">
                      {categories.map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category.id);
                            setSelectedTemplate(null);
                            setCustomMessage('');
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium border transition-colors ${
                            selectedCategory === category.id
                              ? category.color
                              : 'text-gray-500 hover:text-gray-700 border-gray-200'
                          }`}
                        >
                          {category.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Template list */}
                  <div className="px-6 py-4 max-h-60 overflow-y-auto border-b border-gray-200">
                    <div className="space-y-2">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateSelect(template)}
                          className={`w-full text-left p-3 rounded-md border transition-colors ${
                            selectedTemplate?.id === template.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {template.name}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                            {template.content.substring(0, 100)}...
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message editor */}
                  <div className="px-6 py-4">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-900 mb-2">
                      Message Preview & Edit
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select a template above or write a custom message..."
                    />
                    <div className="mt-2 flex justify-between text-xs text-gray-500">
                      <span>Characters: {customMessage.length}</span>
                      <span>
                        {customMessage.length <= 160 ? '1 SMS' :
                         Math.ceil(customMessage.length / 160)} SMS{customMessage.length > 160 ? ' messages' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                    <button
                      onClick={onClose}
                      className="btn-secondary"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!customMessage.trim() || isLoading}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <PaperAirplaneIcon className="h-4 w-4" />
                      <span>{isLoading ? 'Sending...' : 'Send Message'}</span>
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function getDayTip(dayIndex: number): string {
  const tips = {
    0: 'Rest is most important today.',
    1: 'Some swelling and discomfort is normal.',
    2: 'Peak swelling often occurs around now.',
    3: 'Swelling should start to improve soon.',
    4: 'You may feel more energy returning.',
    5: 'Most patients see significant improvement by now.',
    7: 'One week milestone - great progress!'
  };

  return tips[dayIndex as keyof typeof tips] || 'Continue following your post-op instructions.';
}