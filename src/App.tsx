import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Upload, Trash2, Recycle } from 'lucide-react';

function App() {
  const [model, setModel] = useState<tf.LayersModel | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detectedMaterial, setDetectedMaterial] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadModel() {
      try {
        const loadedModel = await tf.loadLayersModel('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json');
        setModel(loadedModel);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setIsLoading(false);
      }
    }
    loadModel();
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target?.result as string);
        classifyImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const classifyImage = async (imageUrl: string) => {
    if (!model) return;

    try {
      const img = new Image();
      img.src = imageUrl;
      await new Promise((resolve) => (img.onload = resolve));

      const tensor = tf.browser
        .fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat()
        .div(255.0)
        .expandDims();

      const predictions = await model.predict(tensor) as tf.Tensor;
      const data = await predictions.data();

      const recyclableCategories = [
        { index: 676, weight: 1.0, name: 'paper', type: 'Paper' },
        { index: 483, weight: 1.0, name: 'newspaper', type: 'Paper' },
        { index: 494, weight: 1.0, name: 'paper towel', type: 'Paper' },
        { index: 603, weight: 1.0, name: 'notebook', type: 'Paper' },
        { index: 415, weight: 1.0, name: 'magazine', type: 'Paper' },
        { index: 532, weight: 1.0, name: 'envelope', type: 'Paper' },
        { index: 671, weight: 1.0, name: 'plastic bottle', type: 'Plastic' },
        { index: 672, weight: 1.0, name: 'plastic bucket', type: 'Plastic' },
        { index: 404, weight: 1.0, name: 'plastic bag', type: 'Plastic' },
        { index: 899, weight: 1.0, name: 'water bottle', type: 'Plastic' },
        { index: 737, weight: 1.0, name: 'recycling bin', type: 'Plastic' },
        { index: 530, weight: 1.0, name: 'glass bottle', type: 'Glass' },
        { index: 531, weight: 1.0, name: 'glass jar', type: 'Glass' },
        { index: 892, weight: 1.0, name: 'wine bottle', type: 'Glass' },
        { index: 907, weight: 1.0, name: 'window', type: 'Glass' },
        { index: 609, weight: 1.0, name: 'metal can', type: 'Metal' },
        { index: 610, weight: 1.0, name: 'metal container', type: 'Metal' },
        { index: 441, weight: 1.0, name: 'milk can', type: 'Metal' },
        { index: 463, weight: 1.0, name: 'tin can', type: 'Metal' },
        { index: 768, weight: 1.0, name: 'soda can', type: 'Metal' },
        { index: 509, weight: 1.0, name: 'aluminum', type: 'Metal' }
      ];

      const materialProbs = recyclableCategories.reduce((acc, cat) => {
        const prob = data[cat.index];
        if (!acc[cat.type]) {
          acc[cat.type] = 0;
        }
        acc[cat.type] = Math.max(acc[cat.type], prob);
        return acc;
      }, {} as Record<string, number>);

      const bestMaterial = Object.entries(materialProbs).reduce((max, [type, prob]) =>
        prob > max.prob ? { type, prob } : max
      , { type: '', prob: 0 });

      const isRecyclable = bestMaterial.prob > 0.01;
      setDetectedMaterial(isRecyclable ? bestMaterial.type : null);
      setPrediction(isRecyclable ? 'Recyclable' : 'Non-recyclable');

      tensor.dispose();
      predictions.dispose();
    } catch (error) {
      console.error('Error classifying image:', error);
      setPrediction('Error classifying image');
      setDetectedMaterial(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex items-center justify-center mb-8">
            {isLoading ? (
              <Recycle className="h-12 w-12 text-green-500 animate-spin" />
            ) : (
              <Recycle className="h-12 w-12 text-green-500" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">
            Waste Classification
          </h1>

          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-green-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />
            </div>

            {imageUrl && (
              <div className="relative">
                <img
                  src={imageUrl}
                  alt="Uploaded waste"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setImageUrl(null);
                    setPrediction(null);
                    setDetectedMaterial(null);
                  }}
                  className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {prediction && (
              <div className={`p-4 rounded-lg ${
                prediction === 'Recyclable'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <p className="text-center font-semibold">
                  {prediction === 'Recyclable' ? 'Recyclable' : 'Non-recyclable'}
                </p>
                {detectedMaterial && (
                  <p className="text-center text-sm mt-1">
                    Detected Material: {detectedMaterial}
                  </p>
                )}
              </div>
            )}

            {isLoading && (
              <div className="text-center text-sm text-gray-600">
                Loading model, please wait...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
